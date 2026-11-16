import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import { Product } from '../../domain/entities/product.entity';
import { ProductImage } from '../../domain/entities/product-image.entity';
import {
  CatalogStatsAggregate,
  IProductRepository,
} from '../../domain/repositories/product.repository.interface';

@Injectable()
export class TypeOrmProductRepository implements IProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
  ) {}

  async create(product: Product): Promise<Product> {
    const savedProduct = await this.productRepository.save(product);

    // Salvar imagens se fornecidas
    if (product.images && product.images.length > 0) {
      const images = product.images.map((image, index) => ({
        ...image,
        productId: savedProduct.id,
        order: index,
      }));
      await this.imageRepository.save(images);
    }

    return this.findById(savedProduct.id);
  }

  async findById(id: number): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id },
      relations: ['images'],
    });
  }

  async findByCode(code: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { code, isActive: true },
      relations: ['images'],
    });
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      relations: ['images'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: number, product: Partial<Product>): Promise<Product> {
    await this.productRepository.update(id, product);

    // Atualizar imagens se fornecidas
    if (product.images) {
      // Remover imagens existentes
      await this.imageRepository.delete({ productId: id });

      // Adicionar novas imagens
      if (product.images.length > 0) {
        const images = product.images.map((image, index) => ({
          ...image,
          productId: id,
          order: index,
        }));
        await this.imageRepository.save(images);
      }
    }

    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.productRepository.softDelete(id);
  }

  async findFeatured(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true, isFeatured: true },
      relations: ['images'],
      order: { createdAt: 'DESC' },
      take: 20, // Retorna os primeiros 20 produtos em destaque
    });
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { category, isActive: true },
      relations: ['images'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySubcategory(subcategory: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { subcategory, isActive: true },
      relations: ['images'],
      order: { createdAt: 'DESC' },
    });
  }

  async searchByName(name: string): Promise<Product[]> {
    return this.productRepository.find({
      where: [
        { name: Like(`%${name}%`), isActive: true },
        { description: Like(`%${name}%`), isActive: true },
      ],
      relations: ['images'],
      order: { createdAt: 'DESC' },
    });
  }

  async findWithPagination(
    page: number,
    limit: number,
  ): Promise<{
    products: Product[];
    total: number;
    totalPages: number;
  }> {
    const [products, total] = await this.productRepository.findAndCount({
      where: { isActive: true },
      relations: ['images'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      products,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findWithFilters(filters: {
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
  }> {
    const {
      category,
      subcategory,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    const where: FindOptionsWhere<Product> = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (subcategory) {
      where.subcategory = subcategory;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.originalPrice = Between(minPrice || 0, maxPrice || 999999);
    }

    if (search) {
      where.name = Like(`%${search}%`);
    }

    const [products, total] = await this.productRepository.findAndCount({
      where,
      relations: ['images'],
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      products,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllForCatalog(): Promise<Product[]> {
    const query = `
      SELECT 
        id, code, description, ncm, stock, "costPrice", supplier, 
        "gtinEan", "gtinEanPackage", "supplierProductDescription", 
        thumbnail, category, subcategory, "originalPrice", 
        "promotionalPrice", "averageRating", "totalReviews", 
        variations, "realImage", name, "isActive", "isFeatured", 
        "createdAt", "updatedAt", "deletedAt", "discountPercentage"
      FROM public.products
    `;

    return await this.productRepository.query(query);
  }

  /**
   * Resumo do catálogo para a home, calculado no banco: nenhum produto trafega.
   *
   * As regras são as que a loja aplicava sobre `GET /products/all` (change
   * add-real-catalog-stats), portanto sobre a mesma população — todo produto
   * não excluído, ativo ou não. O QueryBuilder acrescenta sozinho o
   * `"deletedAt" IS NULL` da coluna de soft delete, como o `find()` de findAll.
   *
   * Exceção deliberada: categoria só conta com produto ATIVO, porque a lista da
   * home leva ao catálogo filtrado, e o catálogo só mostra ativos.
   */
  async getCatalogStats(): Promise<CatalogStatsAggregate> {
    const rated = `product."totalReviews" > 0 AND product."averageRating" > 0`;

    const [totals, categories] = await Promise.all([
      this.productRepository
        .createQueryBuilder('product')
        .select(
          `COUNT(*) FILTER (WHERE product."isActive" AND product.stock > 0)`,
          'available',
        )
        .addSelect(
          `SUM(product."averageRating" * product."totalReviews") FILTER (WHERE ${rated})`,
          'ratingWeightedSum',
        )
        .addSelect(
          `SUM(product."totalReviews") FILTER (WHERE ${rated})`,
          'totalReviews',
        )
        .getRawOne<Omit<CatalogStatsAggregate, 'categories'>>(),
      this.productRepository
        .createQueryBuilder('product')
        .select('product.category', 'name')
        .addSelect('COUNT(*)', 'count')
        .where('product."isActive" = true')
        .andWhere(`product.category IS NOT NULL AND product.category <> ''`)
        .groupBy('product.category')
        .orderBy('product.category', 'ASC')
        .getRawMany<{ name: string; count: string }>(),
    ]);

    return {
      available: totals?.available ?? 0,
      ratingWeightedSum: totals?.ratingWeightedSum ?? null,
      totalReviews: totals?.totalReviews ?? null,
      categories,
    };
  }
}
