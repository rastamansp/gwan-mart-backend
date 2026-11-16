import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModuleOptions } from '@nestjs/cache-manager';
import KeyvRedis, { createKeyv } from '@keyv/redis';

/** Prefixo das chaves: o Redis da P0 é compartilhado entre os apps do ecossistema. */
export const CACHE_NAMESPACE = 'gwan-mart';

/** TTL padrão do cache. O cache-manager v7 mede TTL em milissegundos. */
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Teto para abrir o socket: um host que descarta pacotes não pode prender a chamada. */
const CONNECT_TIMEOUT_MS = 1000;

/** Intervalo máximo entre tentativas de reconexão depois de uma queda. */
const MAX_RECONNECT_DELAY_MS = 2000;

/**
 * Configuração do Redis para cache.
 *
 * O store vinha de `cache-manager-redis-store`, passado em `store`. Com o
 * `@nestjs/cache-manager` v3 (cache-manager v7, sobre Keyv) essa opção é
 * ignorada sem erro: o cache era **em memória** e nenhuma conexão chegava ao
 * Redis — o health respondia `cache: up` com o Redis parado (issue #5). O store
 * agora é declarado em `stores`, com o adaptador Keyv oficial.
 *
 * O cache degrada sem travar quem o usa:
 *  - `disableOfflineQueue`: com a conexão caída, o comando falha na hora em vez
 *    de ficar enfileirado até o Redis voltar (o que prenderia o webhook).
 *  - Depois de conectar uma vez, o cliente **reconecta sozinho** em segundo
 *    plano: o cache volta sem reiniciar a API.
 *  - Antes da primeira conexão, **não** insiste: o `reconnectStrategy` padrão
 *    tentaria para sempre dentro do `connect()`, e com o Redis fora no boot a
 *    primeira chamada ao cache ficaria presa. Falhando, a próxima operação tenta
 *    abrir de novo.
 *  - `throwOnErrors`: o `set` rejeita quando o Redis está fora — é o contrato do
 *    cache-manager e é o que dá ao health a mensagem real do erro. O `get`
 *    continua devolvendo `undefined` (o cache-manager engole erro de leitura).
 */
export const getRedisConfig = (configService: ConfigService): CacheModuleOptions => {
  const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
  const logger = new Logger('RedisCache');
  let everReady = false;

  const keyv = createKeyv(
    {
      url: redisUrl,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: CONNECT_TIMEOUT_MS,
        // `false` (e não o erro): o cliente testa o retorno com `instanceof Error`,
        // que falha quando o erro vem de outro realm (ex.: o `net` sob o Jest) e
        // cai no reconectar-para-sempre que esta estratégia existe para evitar.
        reconnectStrategy: (retries: number) =>
          everReady ? Math.min(2 ** retries * 100, MAX_RECONNECT_DELAY_MS) : false,
      },
    },
    { namespace: CACHE_NAMESPACE, throwOnErrors: true },
  );

  // O erro de conexão se repete a cada tentativa: registra só a transição, para
  // uma queda do Redis não virar uma linha de log por segundo. A volta é medida
  // por `ready`, não por `connect`: com a porta publicada pelo Docker, o TCP
  // conecta mesmo com o Redis parado e o log oscilaria.
  let available = true;
  keyv.on('error', (error: unknown) => {
    if (!available) return;
    available = false;
    logger.warn(`Redis indisponível — cache degradado: ${describeError(error)}`);
  });
  (keyv.store as KeyvRedis<unknown>).client.on('ready', () => {
    everReady = true;
    if (available) return;
    available = true;
    logger.log('Redis reconectado — cache restabelecido');
  });

  return {
    stores: [keyv],
    ttl: DEFAULT_CACHE_TTL_MS,
  };
};

/**
 * `localhost` resolve para IPv6 e IPv4, e a recusa nos dois chega como
 * `AggregateError` de mensagem vazia — o que sobra de útil é o `code`.
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as Error & { code?: string }).code;
  return error.message || code || error.name;
}
