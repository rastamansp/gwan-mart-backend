import { Injectable, Inject } from '@nestjs/common';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { Product } from '../../domain/entities/product.entity';
import { UseCase } from '@/shared/domain/use-case.interface';

@Injectable()
export class GetAllProductsForCatalogUseCase
  implements UseCase<void, Product[]>
{
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(): Promise<Product[]> {
    return this.productRepository.findAllForCatalog();
  }
}
