import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IStorageService } from '../shared/application/interfaces/storage-service.interface';

export type DependencyState = 'up' | 'down';
export type ServiceStatus = 'ok' | 'degraded' | 'unhealthy';

export interface DependencyReport {
  status: DependencyState;
  /** Preenchido apenas quando `down` — mensagem do erro, para o operador. */
  error?: string;
  /** Se a queda derruba o serviço ou apenas o degrada. */
  critical: boolean;
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
  ) {}

  async check(): Promise<HealthReport> {
    const [database, storage, cache] = await Promise.all([
      this.probe(() => this.checkDatabase(), true),
      this.probe(() => this.checkStorage(), false),
      this.probe(() => this.checkCache(), false),
    ]);

    const dependencies = { database, storage, cache };

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
    await this.cache.set(key, '1', 5);
    const value = await this.cache.get(key);
    if (value !== '1') {
      throw new Error('cache não devolveu o valor gravado');
    }
  }
}
