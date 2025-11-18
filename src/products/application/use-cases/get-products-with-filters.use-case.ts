import { Injectable, Inject } from '@nestjs/common';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { Product } from '../../domain/entities/product.entity';
import { ProductFiltersDto } from '../dto/product.dto';
import { UseCase } from '@/shared/domain/use-case.interface';

@Injectable()
export class GetProductsWithFiltersUseCase
  implements
    UseCase<
      ProductFiltersDto,
      {
        products: Product[];
        total: number;
        totalPages: number;
      }
    >
{
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(filters: ProductFiltersDto): Promise<{
    products: Product[];
    total: number;
    totalPages: number;
  }> {
    return this.productRepository.findWithFilters(filters);
  }
}
