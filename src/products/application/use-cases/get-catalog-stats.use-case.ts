import { Injectable, Inject } from '@nestjs/common';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { UseCase } from '@/shared/domain/use-case.interface';

export interface CatalogCategoryStat {
  name: string;
  /** Produtos ativos na categoria — o que o catálogo lista ao filtrar por ela. */
  count: number;
}

export interface CatalogStats {
  /** Produtos ativos com estoque. */
  available: number;
  /** Quantas categorias têm produto ativo (= `categories.length`). */
  categoryCount: number;
  /** Categorias com produto ativo, por nome. */
  categories: CatalogCategoryStat[];
  /** Média ponderada pelo nº de avaliações — `null` se ninguém avaliou. */
  averageRating: number | null;
  /** Total de avaliações que entraram na média. */
  totalReviews: number;
}

/**
 * Resumo do catálogo para a home, sem baixar o catálogo.
 *
 * A média é ponderada — um produto com 3 avaliações não pesa o mesmo que um
 * com 234 — e é `null`, não `0`, quando ninguém avaliou: "0.0" diria que o
 * catálogo é ruim, não que falta avaliação.
 */
@Injectable()
export class GetCatalogStatsUseCase implements UseCase<void, CatalogStats> {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(): Promise<CatalogStats> {
    const aggregate = await this.productRepository.getCatalogStats();

    const weighted = toNumber(aggregate.ratingWeightedSum);
    const totalReviews = toNumber(aggregate.totalReviews);
    const categories = aggregate.categories.map((category) => ({
      name: category.name,
      count: toNumber(category.count),
    }));

    return {
      available: toNumber(aggregate.available),
      categoryCount: categories.length,
      categories,
      averageRating: totalReviews > 0 ? weighted / totalReviews : null,
      totalReviews,
    };
  }
}

/** `bigint`/`numeric` chegam como string; SUM sem linhas chega `null`. */
function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
