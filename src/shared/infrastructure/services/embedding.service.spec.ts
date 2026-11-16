import axios from 'axios';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * O health lê o estado do provedor daqui, sem chamá-lo: ele precisa refletir a
 * última chamada real e se recuperar sozinho quando o provedor volta.
 */
describe('EmbeddingService — estado do provedor', () => {
  const serviceWithKey = (key?: string) =>
    new EmbeddingService({
      get: (name: string) => (name === 'OPENAI_API_KEY' ? key : undefined),
    } as unknown as ConfigService);

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    mockedAxios.isAxiosError.mockReturnValue(false);
  });

  it('chave vazia ou em branco conta como não configurada', () => {
    expect(serviceWithKey(undefined).isConfigured()).toBe(false);
    expect(serviceWithKey('   ').isConfigured()).toBe(false);
    expect(serviceWithKey('   ').getStatus()).toEqual({ configured: false });
  });

  it('registra a falha e limpa no próximo sucesso', async () => {
    const service = serviceWithKey('sk-test');

    mockedAxios.post.mockRejectedValueOnce(new Error('connect ETIMEDOUT'));
    await expect(service.generateEmbedding('cafe')).rejects.toThrow();
    expect(service.getStatus()).toMatchObject({
      configured: true,
      lastError: 'connect ETIMEDOUT',
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: { data: [{ embedding: [0.1, 0.2] }] },
    });
    await expect(service.generateEmbedding('cafe')).resolves.toEqual([0.1, 0.2]);
    expect(service.getStatus()).toEqual({ configured: true });
  });
});
