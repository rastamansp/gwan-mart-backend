import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { Product } from '../../domain/entities/product.entity';
import { UpdateProductDto } from '../dto/product.dto';
import { UseCase } from '@/shared/domain/use-case.interface';

@Injectable()
export class UpdateProductUseCase
  implements UseCase<{ id: number; data: UpdateProductDto }, Product>
{
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute({
    id,
    data,
  }: {
    id: number;
    data: UpdateProductDto;
  }): Promise<Product> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado`);
    }

    // Separar dados de produto das imagens
    const { images, ...productData } = data;

    // Criar imagens se fornecidas
    if (images && images.length > 0) {
      (productData as any).images = images.map((url, index) => ({
        url,
        order: index,
        isActive: true,
      }));
    }

    return this.productRepository.update(id, productData);
  }
}
