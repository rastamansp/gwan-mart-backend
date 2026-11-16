import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IStorageService } from '../shared/application/interfaces/storage-service.interface';
import { IEmbeddingService } from '../shared/application/interfaces/embedding-service.interface';

/**
 * `disabled`: dependência opcional que não foi configurada. Não é queda — é
 * escolha de ambiente —, então não rebaixa o status geral.
 */
export type DependencyState = 'up' | 'down' | 'disabled';
export type ServiceStatus = 'ok' | 'degraded' | 'unhealthy';

export interface DependencyReport {
  status: DependencyState;
  /** Preenchido apenas quando `down` — mensagem do erro, para o operador. */
  error?: string;
  /** Se a queda derruba o serviço ou apenas o degrada. */
  critical: boolean;
  /** O que a dependência sustenta, quando o estado afeta uma função visível. */
  detail?: string;
}

export interface HealthReport {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  dependencies: Record<string, DependencyReport>;
}

/**
 * Verificação de saúde com base nas dependências reais do serviço.
 *
 * A rota respondia `ok` sem consultar nada: bastava o processo existir. Como é
 * ela que o healthcheck do container e o `health-check-production.sh` da infra
 * consultam, um PostgreSQL fora do ar produzia um container "healthy" servindo
 * 500 em todas as rotas de catálogo.
 *
 * Classificação das dependências:
 *  - PostgreSQL é **crítico** — sem ele não há catálogo nem chat.
 *  - MinIO e Redis **degradam**: a leitura do catálogo e o chat continuam de pé
 *    sem upload de imagem ou sem cache, e derrubar o container por causa deles
 *    trocaria uma degradação por uma indisponibilidade (mesmo critério do
 *    gwan-watt, que responde `degraded` com MinIO fora).
 *  - O provedor de embedding (`embeddings`) sustenta só a busca por
 *    similaridade, que cai para textual sem ele. A chave é opcional: ausente,
 *    é `disabled` e o status não muda; presente e falhando, é `down` não
 *    crítico → `degraded`. Não é sondado — chamar o provedor a cada 30s seria
 *    gasto pago —, o estado vem da última chamada real.
 */
@Injectable()
export class HealthService {
  /** Cada verificação tem teto próprio: o healthcheck roda a cada 30s. */
  private readonly checkTimeoutMs = Number(
    process.env.HEALTH_CHECK_TIMEOUT_MS ?? 2000,
  );

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    @Inject('IStorageService')
    private readonly storage?: IStorageService,
    @Optional()
    @Inject(CACHE_MANAGER)
    private readonly cache?: Cache,
    @Optional()
    @Inject('IEmbeddingService')
    private readonly embedding?: IEmbeddingService,
  ) {}

  async check(): Promise<HealthReport> {
    const [database, storage, cache] = await Promise.all([
      this.probe(() => this.checkDatabase(), true),
      this.probe(() => this.checkStorage(), false),
      this.probe(() => this.checkCache(), false),
    ]);

    const dependencies = {
      database,
      storage,
      cache,
      embeddings: this.embeddingReport(),
    };

    const anyCriticalDown = Object.values(dependencies).some(
      (d) => d.critical && d.status === 'down',
    );
    const anyDown = Object.values(dependencies).some((d) => d.status === 'down');

    return {
      status: anyCriticalDown ? 'unhealthy' : anyDown ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      dependencies,
    };
  }

  private embeddingReport(): DependencyReport {
    const status = this.embedding?.getStatus();

    if (!status?.configured) {
      return {
        status: 'disabled',
        critical: false,
        detail:
          'busca por similaridade indisponível (OPENAI_API_KEY ausente); a busca do catálogo usa modo textual',
      };
    }

    if (status.lastError) {
      return {
        status: 'down',
        critical: false,
        error: `${status.lastError} (em ${status.lastErrorAt})`,
        detail:
          'última chamada ao provedor de embedding falhou; a busca do catálogo cai para modo textual até a próxima chamada bem-sucedida',
      };
    }

    return {
      status: 'up',
      critical: false,
      detail: 'busca por similaridade disponível',
    };
  }

  private async probe(
    fn: () => Promise<void>,
    critical: boolean,
  ): Promise<DependencyReport> {
    try {
      await this.withTimeout(fn());
      return { status: 'up', critical };
    } catch (error) {
      return {
        status: 'down',
        critical,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`timeout após ${this.checkTimeoutMs}ms`)),
          this.checkTimeoutMs,
        ).unref(),
      ),
    ]);
  }

  private async checkDatabase(): Promise<void> {
    await this.dataSource.query('SELECT 1');
  }

  private async checkStorage(): Promise<void> {
    if (!this.storage?.checkHealth) {
      throw new Error('storage não configurado');
    }
    await this.storage.checkHealth();
  }

  private async checkCache(): Promise<void> {
    if (!this.cache) {
      throw new Error('cache não configurado');
    }
    const key = 'health:ping';
    // TTL em milissegundos (cache-manager v7). Valia `5` quando se lia como
    // segundos: no Redis a chave expirava antes do `get` e o check oscilava.
    await this.cache.set(key, '1', 5000);
    const value = await this.cache.get(key);
    if (value !== '1') {
      throw new Error('cache não devolveu o valor gravado');
    }
  }
}
