import { Product } from '../entities/product.entity';

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
}
