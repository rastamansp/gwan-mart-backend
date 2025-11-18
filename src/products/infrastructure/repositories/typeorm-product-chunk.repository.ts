import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductChunk } from '../../domain/entities/product-chunk.entity';

export interface IProductChunkRepository {
  save(chunk: ProductChunk): Promise<ProductChunk>;
  saveMany(chunks: ProductChunk[]): Promise<ProductChunk[]>;
  findByProductId(productId: number): Promise<ProductChunk[]>;
  findByProductCode(productCode: string): Promise<ProductChunk[]>;
  findByCategory(category: string): Promise<ProductChunk[]>;
  findBySupplier(supplier: string): Promise<ProductChunk[]>;
  searchSimilar(embedding: number[], limit?: number): Promise<ProductChunk[]>;
  deleteByProductId(productId: number): Promise<void>;
  deleteAll(): Promise<void>;
  findAll(): Promise<ProductChunk[]>;
}

@Injectable()
export class TypeOrmProductChunkRepository implements IProductChunkRepository {
  constructor(
    @InjectRepository(ProductChunk)
    private readonly chunkRepository: Repository<ProductChunk>,
  ) {}

  async save(chunk: ProductChunk): Promise<ProductChunk> {
    return this.chunkRepository.save(chunk);
  }

  async saveMany(chunks: ProductChunk[]): Promise<ProductChunk[]> {
    return this.chunkRepository.save(chunks);
  }

  async findByProductId(productId: number): Promise<ProductChunk[]> {
    return this.chunkRepository.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByProductCode(productCode: string): Promise<ProductChunk[]> {
    return this.chunkRepository.find({
      where: { productCode },
      order: { createdAt: 'DESC' },
    });
  }

  async findByCategory(category: string): Promise<ProductChunk[]> {
    return this.chunkRepository
      .createQueryBuilder('chunk')
      .where("chunk.metadata->>'category' = :category", { category })
      .orderBy('chunk.createdAt', 'DESC')
      .getMany();
  }

  async findBySupplier(supplier: string): Promise<ProductChunk[]> {
    return this.chunkRepository
      .createQueryBuilder('chunk')
      .where("chunk.metadata->>'supplier' = :supplier", { supplier })
      .orderBy('chunk.createdAt', 'DESC')
      .getMany();
  }

  async searchSimilar(
    embedding: number[],
    limit: number = 10,
  ): Promise<ProductChunk[]> {
    // Para busca por similaridade, vamos usar uma abordagem mais simples
    // que calcula a similaridade do cosseno diretamente no código
    const allChunks = await this.chunkRepository.find();

    const similarities = allChunks.map(chunk => {
      const chunkEmbedding = chunk.getEmbeddingVector();
      const similarity = this.cosineSimilarity(embedding, chunkEmbedding);
      return { chunk, similarity };
    });

    // Ordenar por similaridade (maior primeiro)
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, limit).map(item => item.chunk);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vetores devem ter a mesma dimensão');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async deleteByProductId(productId: number): Promise<void> {
    await this.chunkRepository.delete({ productId });
  }

  async deleteAll(): Promise<void> {
    // Usar query builder para deletar todos os registros
    await this.chunkRepository.createQueryBuilder().delete().execute();
  }

  async findAll(): Promise<ProductChunk[]> {
    return this.chunkRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
