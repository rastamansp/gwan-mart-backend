import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('product_chunks')
export class ProductChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index('idx_product_chunk_product_id')
  productId: number;

  @Column({ type: 'varchar', length: 255 })
  @Index('idx_product_chunk_product_code')
  productCode: string;

  @Column({ type: 'varchar', length: 500 })
  productName: string;

  @Column({ type: 'text' })
  structuredText: string;

  @Column({ type: 'jsonb' })
  metadata: {
    // Informações básicas
    category: string;
    subcategory: string;
    supplier: string;
    isActive: boolean;
    isFeatured: boolean;

    // Preços
    originalPrice: number;
    promotionalPrice?: number;
    costPrice: number;
    discountPercentage: number;

    // Estoque e disponibilidade
    stock: number;

    // Avaliações
    averageRating: number;
    totalReviews: number;

    // Identificação
    ncm: string;
    gtinEan: string;
    gtinEanPackage: string;

    // Imagens
    realImage: string;
    thumbnail: string;
    images: Array<{
      url: string;
      alt?: string;
      order: number;
      isActive: boolean;
    }>;

    // Variações
    variations?: any[];

    // Datas
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  };

  @Column({ type: 'text' })
  embedding: string; // Armazenar como JSON string para compatibilidade

  @Column({ type: 'varchar', length: 100, default: 'product_catalog' })
  @Index('idx_product_chunk_type')
  type: string;

  @Column({ type: 'varchar', length: 100, default: 'gwan_backend' })
  @Index('idx_product_chunk_source')
  source: string;

  @CreateDateColumn()
  @Index('idx_product_chunk_created_at')
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Método helper para converter embedding
  getEmbeddingVector(): number[] {
    return JSON.parse(this.embedding);
  }

  setEmbeddingVector(vector: number[]): void {
    this.embedding = JSON.stringify(vector);
  }
}
