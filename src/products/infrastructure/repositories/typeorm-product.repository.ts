import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import { Product } from '../../domain/entities/product.entity';
import { ProductImage } from '../../domain/entities/product-image.entity';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import {
  ACCENTED_CHARS,
  PLAIN_CHARS,
  escapeLikePattern,
  searchTokens,
} from '../../domain/text-search';

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

  async searchByText(term: string, limit: number): Promise<Product[]> {
    const tokens = searchTokens(term);
    if (tokens.length === 0) {
      return [];
    }

    // Sem `unaccent`/`pg_trgm` (extensões exigiriam migration): lower +
    // translate com a mesma tabela aplicada ao termo. Varre a tabela — aceitável
    // no tamanho atual do catálogo; ver a change fix-semantic-search-without-embedding.
    const column = (name: string) =>
      `translate(lower(product.${name}), :accented, :plain)`;
    const fields = ['name', 'code', 'category', 'subcategory'];

    const params: Record<string, string> = {
      accented: ACCENTED_CHARS,
      plain: PLAIN_CHARS,
    };
    const anyField: string[] = [];
    const inName: string[] = [];
    tokens.forEach((token, i) => {
      params[`t${i}`] = `%${escapeLikePattern(token)}%`;
      anyField.push(
        `(${fields.map((f) => `${column(f)} LIKE :t${i}`).join(' OR ')})`,
      );
      inName.push(`${column('name')} LIKE :t${i}`);
    });
    const countOf = (conditions: string[]) =>
      conditions.map((c) => `(CASE WHEN ${c} THEN 1 ELSE 0 END)`).join(' + ');

    return (
      this.productRepository
        // Sem join de `images`: o resultado da busca usa `realImage`, e `take`
        // com join não aceita ORDER BY por expressão.
        .createQueryBuilder('product')
        .where('product.isActive = true')
        // Basta uma palavra casar; quem casa mais palavras vem antes, e casar
        // no nome desempata.
        .andWhere(`(${anyField.join(' OR ')})`)
        .setParameters(params)
        .orderBy(`(${countOf(anyField)})`, 'DESC')
        .addOrderBy(`(${countOf(inName)})`, 'DESC')
        .addOrderBy('product.name', 'ASC')
        .limit(limit)
        .getMany()
    );
  }
}
