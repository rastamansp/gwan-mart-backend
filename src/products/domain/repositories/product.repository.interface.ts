import { Product } from '../entities/product.entity';

/**
 * Agregados do catálogo como o banco os devolve: o driver do PostgreSQL entrega
 * `bigint` (COUNT/SUM de int) e `numeric` como string, e SUM sem nenhuma linha
 * vem `null`. A conversão para número fica no use case.
 */
export interface CatalogStatsAggregate {
  /** Produtos ativos com estoque > 0. */
  available: string | number | null;
  /** Σ(averageRating × totalReviews) dos produtos avaliados. */
  ratingWeightedSum: string | number | null;
  /** Σ totalReviews dos mesmos produtos — o denominador da média. */
  totalReviews: string | number | null;
  /** Categorias não vazias com produto ativo, e quantos ativos cada uma tem. */
  categories: Array<{ name: string; count: string | number }>;
}

export interface IProductRepository {
  create(product: Product): Promise<Product>;
  findById(id: number): Promise<Product | null>;
  findByCode(code: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  update(id: number, product: Partial<Product>): Promise<Product>;
  delete(id: number): Promise<void>;
  findFeatured(): Promise<Product[]>;
  findByCategory(category: string): Promise<Product[]>;
  findBySubcategory(subcategory: string): Promise<Product[]>;
  searchByName(name: string): Promise<Product[]>;
  findWithPagination(
    page: number,
    limit: number,
  ): Promise<{
    products: Product[];
    total: number;
    totalPages: number;
  }>;
  findWithFilters(filters: {
    category?: string;
    subcategory?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{
    products: Product[];
    total: number;
    totalPages: number;
  }>;
  findAllForCatalog(): Promise<Product[]>;
  getCatalogStats(): Promise<CatalogStatsAggregate>;
}
