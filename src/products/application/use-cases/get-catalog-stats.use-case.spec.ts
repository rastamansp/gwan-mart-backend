import { GetCatalogStatsUseCase } from './get-catalog-stats.use-case';
import {
  CatalogStatsAggregate,
  IProductRepository,
} from '../../domain/repositories/product.repository.interface';

/**
 * O resumo da home saiu do navegador (change add-real-catalog-stats, que
 * baixava /products/all inteiro) para uma consulta agregada. O SQL faz as
 * contas; este use case converte o que o driver do PostgreSQL devolve —
 * `bigint`/`numeric` como string, SUM vazio como `null` — e fecha a média.
 * Estes testes fixam esse contrato.
 */
describe('GetCatalogStatsUseCase', () => {
  const run = (aggregate: CatalogStatsAggregate) =>
    new GetCatalogStatsUseCase({
      getCatalogStats: async () => aggregate,
    } as unknown as IProductRepository).execute();

  it('converte os agregados do driver (strings) em números', async () => {
    const stats = await run({
      available: '5',
      ratingWeightedSum: '5831.70',
      totalReviews: '1269',
      categories: [{ name: 'Eletrônicos', count: '5' }],
    });

    expect(stats).toEqual({
      available: 5,
      categoryCount: 1,
      categories: [{ name: 'Eletrônicos', count: 5 }],
      averageRating: 5831.7 / 1269,
      totalReviews: 1269,
    });
  });

  it('pondera a média pelo número de avaliações', async () => {
    // Nota 5.0 com 300 avaliações e nota 1.0 com 3: a simples daria 3.0; a
    // ponderada fica perto do produto muito avaliado.
    const stats = await run({
      available: 2,
      ratingWeightedSum: 5 * 300 + 1 * 3,
      totalReviews: 303,
      categories: [],
    });

    expect(stats.averageRating).toBeCloseTo(1503 / 303, 10);
    expect(stats.averageRating).toBeGreaterThan(4.9);
  });

  it('devolve média null, e não zero, quando ninguém avaliou', async () => {
    const stats = await run({
      available: 3,
      ratingWeightedSum: null,
      totalReviews: null,
      categories: [{ name: 'Casa', count: '3' }],
    });

    expect(stats.averageRating).toBeNull();
    expect(stats.totalReviews).toBe(0);
  });

  it('catálogo vazio: zeros, lista vazia e média null', async () => {
    const stats = await run({
      available: '0',
      ratingWeightedSum: null,
      totalReviews: null,
      categories: [],
    });

    expect(stats).toEqual({
      available: 0,
      categoryCount: 0,
      categories: [],
      averageRating: null,
      totalReviews: 0,
    });
  });

  it('categoryCount acompanha a lista de categorias, na ordem do banco', async () => {
    const stats = await run({
      available: '4',
      ratingWeightedSum: null,
      totalReviews: null,
      categories: [
        { name: 'Áudio', count: '1' },
        { name: 'Eletrônicos', count: '2' },
        { name: 'Informática', count: '3' },
      ],
    });

    expect(stats.categoryCount).toBe(3);
    expect(stats.categories.map((c) => c.name)).toEqual([
      'Áudio',
      'Eletrônicos',
      'Informática',
    ]);
    expect(stats.categories.map((c) => c.count)).toEqual([1, 2, 3]);
  });
});
