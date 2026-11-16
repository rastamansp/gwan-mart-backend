import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import { ProductsController } from './products.controller';
import {
  GetCatalogStatsUseCase,
  GetProductByCodeUseCase,
} from '../application/use-cases';

/**
 * `GET /products/stats` divide o prefixo com `GET /products/:code`. Se a rota
 * de resumo for declarada depois da de código, o Express entrega "stats" como
 * código de produto e a home recebe 404. Este teste sobe o controller real
 * (dependências simuladas) e fixa a ordem.
 */
describe('GET /products/stats', () => {
  let app: INestApplication;

  const stats = {
    available: 5,
    categoryCount: 1,
    categories: [{ name: 'Eletrônicos', count: 5 }],
    averageRating: 4.6,
    totalReviews: 1269,
  };
  const getCatalogStats = { execute: jest.fn(async () => stats) };
  const getProductByCode = {
    execute: jest.fn(async (code: string) => ({ code, images: [] })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: GetCatalogStatsUseCase, useValue: getCatalogStats },
        { provide: GetProductByCodeUseCase, useValue: getProductByCode },
      ],
    })
      .useMocker(() => ({}))
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde o resumo no envelope padrão, sem cair na busca por código', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/stats')
      .expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.data).toEqual(stats);
    expect(getCatalogStats.execute).toHaveBeenCalledTimes(1);
    expect(getProductByCode.execute).not.toHaveBeenCalled();
  });

  it('a busca por código continua atendendo os demais códigos', async () => {
    await request(app.getHttpServer()).get('/products/PROD-001').expect(200);

    expect(getProductByCode.execute).toHaveBeenCalledWith('PROD-001');
  });
});
