import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { Product } from '../../domain/entities/product.entity';
import { UseCase } from '@/shared/domain/use-case.interface';

@Injectable()
export class GetProductByCodeUseCase implements UseCase<string, Product> {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(code: string): Promise<Product> {
    const product = await this.productRepository.findByCode(code);
    if (!product) {
      throw new NotFoundException(`Produto com código ${code} não encontrado`);
    }
    return product;
  }
}
