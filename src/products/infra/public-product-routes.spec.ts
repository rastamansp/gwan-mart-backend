import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as request from 'supertest';
import { ProductsController } from './products.controller';
import { SeoController } from '../../seo/seo.controller';
import {
  GetAllProductsUseCase,
  GetCatalogStatsUseCase,
  GetFeaturedProductsUseCase,
  GetProductByCodeUseCase,
  GetProductsWithFiltersUseCase,
  SearchProductsUseCase,
} from '../application/use-cases';
import { INTERNAL_PRODUCT_FIELDS } from '../application/public-product';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Product } from '../domain/entities/product.entity';

/**
 * Nenhuma rota que um visitante anônimo alcança devolve dado comercial do
 * produto. Sobe os controllers reais com os use cases reais; só o repositório,
 * o provedor de embedding e o storage de chunks são simulados — e carregam os
 * campos internos com valores-sentinela, para que um vazamento apareça mesmo
 * sob outro nome de chave ou dentro de HTML.
 *
 * As tools do chat (`list_products`, `get_product_by_code`) chamam por HTTP as
 * rotas `GET /products` e `GET /products/:code`, então ficam cobertas aqui.
 */
describe('rotas públicas de produto não expõem campos internos', () => {
  const SECRET_SUPPLIER = 'FORNECEDOR-SECRETO-ZX';
  const SECRET_COST = 12.34;
  const SECRET_PACKAGE_GTIN = 'EMB-SECRETA-99';
  const SECRETS = [SECRET_SUPPLIER, String(SECRET_COST), SECRET_PACKAGE_GTIN];

  function product(overrides: Partial<Product>): Product {
    return {
      id: 7,
      code: 'CAF-001',
      name: 'Café Especial',
      description: 'Grãos selecionados',
      supplierProductDescription: 'Café 100% arábica, torra média',
      ncm: '09012100',
      stock: 12,
      costPrice: SECRET_COST,
      supplier: SECRET_SUPPLIER,
      gtinEan: '7890000000017',
      gtinEanPackage: SECRET_PACKAGE_GTIN,
      thumbnail: 'https://img/cafe-thumb.jpg',
      realImage: 'https://img/cafe.jpg',
      category: 'Mercearia',
      subcategory: 'Cafés',
      originalPrice: 39.9,
      promotionalPrice: null,
      discountPercentage: 0,
      averageRating: 4.5,
      totalReviews: 10,
      variations: null,
      isActive: true,
      isFeatured: true,
      images: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
      deletedAt: null,
      ...overrides,
    } as unknown as Product;
  }

  const active = product({});
  const inactive = product({ id: 8, code: 'CAF-OFF', isActive: false });

  const productRepository = {
    findWithFilters: jest.fn(async () => ({
      products: [active],
      total: 1,
      totalPages: 1,
    })),
    findAll: jest.fn(async () => [active, inactive]),
    findFeatured: jest.fn(async () => [active]),
    findByCode: jest.fn(async (code: string) =>
      code === active.code ? active : null,
    ),
    searchByText: jest.fn(async () => [active]),
    getCatalogStats: jest.fn(async () => ({
      available: '1',
      ratingWeightedSum: '45',
      totalReviews: '10',
      categories: [{ name: 'Mercearia', count: '1' }],
    })),
  };

  // O chunk semântico grava o produto inteiro em `metadata`, inclusive custo
  // e fornecedor — é de onde saía o vazamento.
  const chunk = (p: Product) => ({
    productId: p.id,
    productCode: p.code,
    productName: p.name,
    metadata: { ...p, images: [] },
    getEmbeddingVector: () => [1, 0],
  });
  const chunkRepository = {
    searchSimilar: jest.fn(async () => [chunk(active), chunk(inactive)]),
  };

  let embeddingConfigured = true;
  const embeddingService = {
    isConfigured: () => embeddingConfigured,
    generateEmbedding: jest.fn(async () => [1, 0]),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController, SeoController],
      providers: [
        GetProductsWithFiltersUseCase,
        GetAllProductsUseCase,
        GetFeaturedProductsUseCase,
        GetProductByCodeUseCase,
        GetCatalogStatsUseCase,
        SearchProductsUseCase,
        { provide: 'IProductRepository', useValue: productRepository },
        { provide: 'IProductChunkRepository', useValue: chunkRepository },
        { provide: 'IEmbeddingService', useValue: embeddingService },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    })
      .useMocker(() => ({}))
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      // Simula o JWT: o papel vem de um header de teste; sem ele, 401 — como
      // o guard real faz sem token.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const role = req.headers['x-test-role'];
          if (!role) throw new UnauthorizedException();
          req.user = { id: 'u1', role };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    // Mesmo pipe global do main.ts.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    embeddingConfigured = true;
  });

  /** Falha se algum campo interno aparecer como chave, em qualquer nível. */
  function expectNoInternalKeys(value: unknown, path = 'body'): void {
    if (Array.isArray(value)) {
      value.forEach((item, i) => expectNoInternalKeys(item, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) {
        expect({ path: `${path}.${key}`, internal: false }).toEqual({
          path: `${path}.${key}`,
          internal: (INTERNAL_PRODUCT_FIELDS as readonly string[]).includes(key),
        });
        expectNoInternalKeys(nested, `${path}.${key}`);
      }
    }
  }

  /** Falha se um valor-sentinela aparecer no texto da resposta (JSON, HTML ou XML). */
  function expectNoSecrets(text: string): void {
    for (const secret of SECRETS) {
      expect(text).not.toContain(secret);
    }
  }

  const publicJsonRoutes: Array<[string, () => request.Test]> = [
    ['GET /products', () => request(app.getHttpServer()).get('/products')],
    ['GET /products/all', () => request(app.getHttpServer()).get('/products/all')],
    [
      'GET /products/featured',
      () => request(app.getHttpServer()).get('/products/featured'),
    ],
    ['GET /products/stats', () => request(app.getHttpServer()).get('/products/stats')],
    ['GET /products/:code', () => request(app.getHttpServer()).get('/products/CAF-001')],
    [
      'POST /products/search/similar (semântica)',
      () =>
        request(app.getHttpServer())
          .post('/products/search/similar')
          .send({ query: 'café' }),
    ],
  ];

  it.each(publicJsonRoutes)('%s', async (_name, call) => {
    const response = await call().expect((res) => {
      if (res.status >= 300) throw new Error(`status ${res.status}`);
    });

    expectNoInternalKeys(response.body);
    expectNoSecrets(response.text);
  });

  it('a busca semântica de fato rodou no modo semântico e omitiu o inativo', async () => {
    const response = await request(app.getHttpServer())
      .post('/products/search/similar')
      .send({ query: 'café' })
      .expect(201);

    expect(response.body.data.mode).toBe('semantic');
    expect(response.body.data.results).toHaveLength(1);
    expect(response.body.data.results[0]).toMatchObject({
      productCode: 'CAF-001',
      similarity: 1,
      metadata: { category: 'Mercearia', originalPrice: 39.9, stock: 12 },
    });
  });

  it('a busca textual (sem provedor) passa pela mesma projeção', async () => {
    const search = () =>
      request(app.getHttpServer())
        .post('/products/search/similar')
        .send({ query: 'café' })
        .expect(201);

    embeddingConfigured = false;
    const text = await search();
    embeddingConfigured = true;
    const semantic = await search();

    expect(text.body.data.mode).toBe('text');
    expect(semantic.body.data.mode).toBe('semantic');
    expectNoInternalKeys(text.body);
    expectNoSecrets(text.text);
    // Mesmo produto, mesma forma nos dois modos.
    expect(text.body.data.results[0].metadata).toEqual(
      semantic.body.data.results[0].metadata,
    );
  });

  it('o detalhe público mantém o que a vitrine mostra', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/CAF-001')
      .expect(200);

    expect(response.body.data).toMatchObject({
      code: 'CAF-001',
      name: 'Café Especial',
      supplierProductDescription: 'Café 100% arábica, torra média',
      ncm: '09012100',
      gtinEan: '7890000000017',
      originalPrice: 39.9,
      stock: 12,
    });
  });

  it('GET /products/all não lista produto inativo ao visitante', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/all')
      .expect(200);

    expect(response.body.data.map((p: Product) => p.code)).toEqual(['CAF-001']);
  });

  it('GET /products recusa ordenar por campo interno', async () => {
    await request(app.getHttpServer())
      .get('/products?sortBy=costPrice')
      .expect(400);
  });

  it('prévia de link (SEO head) e sitemap não carregam campos internos', async () => {
    const head = await request(app.getHttpServer())
      .get('/seo/products/CAF-001/head')
      .expect(200);
    const sitemap = await request(app.getHttpServer())
      .get('/seo/sitemap.xml')
      .expect(200);

    expectNoSecrets(head.text);
    expectNoSecrets(sitemap.text);
  });

  describe('GET /products/admin/all', () => {
    it('sem token, 401', async () => {
      await request(app.getHttpServer()).get('/products/admin/all').expect(401);
    });

    it('papel sem acesso ao catálogo, 403', async () => {
      await request(app.getHttpServer())
        .get('/products/admin/all')
        .set('x-test-role', 'USER')
        .expect(403);
    });

    it('admin recebe tudo, inclusive inativos e campos internos', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/admin/all')
        .set('x-test-role', 'ADMIN')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        costPrice: SECRET_COST,
        supplier: SECRET_SUPPLIER,
        gtinEanPackage: SECRET_PACKAGE_GTIN,
      });
    });
  });
});
