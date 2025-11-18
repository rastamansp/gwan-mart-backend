import { Injectable, Inject } from '@nestjs/common';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { Product } from '../../domain/entities/product.entity';
import { CreateProductDto } from '../dto/product.dto';
import { UseCase } from '@/shared/domain/use-case.interface';

@Injectable()
export class CreateProductUseCase
  implements UseCase<CreateProductDto, Product>
{
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(input: CreateProductDto): Promise<Product> {
    const product = new Product();

    // Separar dados de produto das imagens
    const { images, ...productData } = input;
    Object.assign(product, productData);

    // Criar imagens se fornecidas
    if (images && images.length > 0) {
      (product as any).images = images.map((url, index) => ({
        url,
        order: index,
        isActive: true,
      }));
    }

    return this.productRepository.create(product);
  }
}
