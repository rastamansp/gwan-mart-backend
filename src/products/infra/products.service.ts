import { Injectable, Inject } from '@nestjs/common';
import { IProductRepository } from '../domain/repositories/product.repository.interface';
import { Product } from '../domain/entities/product.entity';
import { LoggingService } from '@/shared/infrastructure/logger/logging.service';

/**
 * Serviço de Produtos - acesso aos dados
 * Seguindo Clean Architecture - adaptador de infraestrutura
 */
@Injectable()
export class ProductsService {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Busca produto por ID
   * @param id ID do produto
   * @returns Dados do produto ou null se não encontrado
   */
  async findById(id: number): Promise<Product | null> {
    const product = await this.productRepository.findById(id);

    this.loggingService.log('Product search by ID', 'ProductsService', {
      productId: id,
      found: !!product,
      timestamp: new Date().toISOString(),
    });

    return product;
  }

  /**
   * Retorna todos os produtos
   * @returns Array com todos os produtos
   */
  async findAll(): Promise<Product[]> {
    return this.productRepository.findAll();
  }

  /**
   * Retorna produtos em destaque
   * @returns Array com produtos em destaque
   */
  async findFeatured(): Promise<Product[]> {
    return this.productRepository.findFeatured();
  }

  /**
   * Retorna estatísticas dos produtos
   * @returns Estatísticas dos produtos
   */
  async getStats(): Promise<{
    total: number;
    withStock: number;
    withoutStock: number;
    featured: number;
  }> {
    const allProducts = await this.productRepository.findAll();
    const featuredProducts = await this.productRepository.findFeatured();

    const total = allProducts.length;
    const withStock = allProducts.filter(p => p.stock > 0).length;
    const withoutStock = total - withStock;
    const featured = featuredProducts.length;

    return {
      total,
      withStock,
      withoutStock,
      featured,
    };
  }
}
