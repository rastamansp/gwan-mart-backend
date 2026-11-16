import { ConfigService } from '@nestjs/config';
import { createCache } from 'cache-manager';
import { Keyv } from '@keyv/redis';
import { DataSource } from 'typeorm';
import { HealthService } from '../health/health.service';
import { IStorageService } from '../shared/application/interfaces/storage-service.interface';
import { CACHE_NAMESPACE, DEFAULT_CACHE_TTL_MS, getRedisConfig } from './redis.config';

/**
 * O cache era em memória sem ninguém saber: a config passava `store` (opção do
 * cache-manager v5), que o `@nestjs/cache-manager` v3 ignora. Com isso o health
 * dizia `cache: up` com o Redis parado (issue #5).
 */
describe('getRedisConfig', () => {
  const configWith = (url: string) =>
    ({ get: (key: string) => (key === 'REDIS_URL' ? url : undefined) }) as unknown as ConfigService;

  const opened: Keyv[] = [];
  afterAll(async () => {
    await Promise.all(opened.map((k) => k.disconnect().catch(() => undefined)));
  });

  it('declara o Redis em `stores` (a opção lida pelo @nestjs/cache-manager v3)', () => {
    const options = getRedisConfig(configWith('redis://localhost:6379'));
    const stores = options.stores as Keyv[];
    opened.push(...stores);

    expect(options).not.toHaveProperty('store');
    expect(stores).toHaveLength(1);
    expect(stores[0]).toBeInstanceOf(Keyv);
    expect(stores[0].namespace).toBe(CACHE_NAMESPACE);
  });

  it('TTL padrão em milissegundos (cache-manager v7)', () => {
    const options = getRedisConfig(configWith('redis://localhost:6379'));
    opened.push(...(options.stores as Keyv[]));

    expect(options.ttl).toBe(DEFAULT_CACHE_TTL_MS);
    expect(DEFAULT_CACHE_TTL_MS).toBe(300_000);
  });

  it('Redis inacessível: health "degraded" com o erro real, sem esperar o timeout', async () => {
    // Porta 1 recusa a conexão na hora — o equivalente local de "Redis parado".
    const options = getRedisConfig(configWith('redis://127.0.0.1:1'));
    const stores = options.stores as Keyv[];
    opened.push(...stores);
    const cache = createCache({ stores, ttl: options.ttl as number });

    const health = new HealthService(
      { query: jest.fn().mockResolvedValue([1]) } as unknown as DataSource,
      { checkHealth: jest.fn().mockResolvedValue(undefined) } as unknown as IStorageService,
      cache as never,
    );

    const started = Date.now();
    const report = await health.check();
    const elapsed = Date.now() - started;

    expect(report.status).toBe('degraded');
    expect(report.dependencies.cache).toMatchObject({ status: 'down', critical: false });
    expect(report.dependencies.cache.error).not.toMatch(/timeout/);
    expect(elapsed).toBeLessThan(1500);
  });
});
