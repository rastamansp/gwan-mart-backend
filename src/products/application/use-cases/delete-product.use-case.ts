import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { UseCase } from '@/shared/domain/use-case.interface';

@Injectable()
export class DeleteProductUseCase implements UseCase<number, void> {
  constructor(
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(id: number): Promise<void> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado`);
    }

    return this.productRepository.delete(id);
  }
}
