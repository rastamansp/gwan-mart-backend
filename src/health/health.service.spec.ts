import { DataSource } from 'typeorm';
import { HealthService } from './health.service';
import {
  EmbeddingProviderStatus,
  IEmbeddingService,
} from '../shared/application/interfaces/embedding-service.interface';
import { IStorageService } from '../shared/application/interfaces/storage-service.interface';

/**
 * A busca por similaridade depende de uma chave opcional. O health precisa
 * dizer se ela está disponível sem tratar "não configurada" como queda.
 */
describe('HealthService — embeddings', () => {
  const dataSource = { query: jest.fn().mockResolvedValue([1]) } as unknown as DataSource;
  const storage = { checkHealth: jest.fn().mockResolvedValue(undefined) } as unknown as IStorageService;
  const store = new Map<string, unknown>();
  const cache = {
    set: jest.fn(async (key: string, value: unknown) => void store.set(key, value)),
    get: jest.fn(async (key: string) => store.get(key)),
  };

  const serviceWith = (status: EmbeddingProviderStatus) =>
    new HealthService(dataSource, storage, cache as never, {
      getStatus: () => status,
    } as unknown as IEmbeddingService);

  it('sem chave: embeddings "disabled" e status geral continua ok', async () => {
    const report = await serviceWith({ configured: false }).check();

    expect(report.dependencies.embeddings).toMatchObject({
      status: 'disabled',
      critical: false,
    });
    expect(report.status).toBe('ok');
  });

  it('com chave e última chamada falhando: "down" não crítico, status degraded', async () => {
    const report = await serviceWith({
      configured: true,
      lastError: 'Incorrect API key provided',
      lastErrorAt: '2026-11-16T00:00:00.000Z',
    }).check();

    expect(report.dependencies.embeddings.status).toBe('down');
    expect(report.dependencies.embeddings.critical).toBe(false);
    expect(report.dependencies.embeddings.error).toContain('Incorrect API key');
    expect(report.status).toBe('degraded');
  });

  it('com chave e sem falha registrada: "up"', async () => {
    const report = await serviceWith({ configured: true }).check();

    expect(report.dependencies.embeddings.status).toBe('up');
    expect(report.status).toBe('ok');
  });
});
