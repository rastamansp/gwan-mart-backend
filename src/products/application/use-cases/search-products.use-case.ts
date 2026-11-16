import { Inject, Injectable, Logger } from '@nestjs/common';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { IProductChunkRepository } from '../../infrastructure/repositories/typeorm-product-chunk.repository';
import { IEmbeddingService } from '@/shared/application/interfaces/embedding-service.interface';
import {
  PublicSearchMetadata,
  toPublicSearchMetadata,
} from '../public-product';

export type SearchMode = 'semantic' | 'text';

/** Por que a busca não foi semântica. Ausente no modo semântico. */
export type SearchFallbackReason = 'embedding-not-configured' | 'semantic-search-failed';

export interface ProductSearchHit {
  productId: number;
  productCode: string;
  productName: string;
  /** Grau de similaridade (0–1). `null` no modo textual: não há o que medir. */
  similarity: number | null;
  image: string | null;
  /**
   * Sempre a projeção pública, nos dois modos: a rota é anônima, e o
   * `metadata` do chunk semântico carrega `costPrice` e `supplier`.
   */
  metadata: PublicSearchMetadata;
}

export interface ProductSearchResult {
  mode: SearchMode;
  fallbackReason?: SearchFallbackReason;
  results: ProductSearchHit[];
}

/**
 * Busca do catálogo: semântica quando há provedor de embedding, textual quando
 * não há — ou quando ele falha.
 *
 * A chave da OpenAI é opcional neste app (o chat pode ser Claude), e a busca é
 * pública: a falta ou a queda de um fornecedor opcional não pode virar 500
 * para o visitante (issue #12). Erro de verdade — o banco fora, por exemplo —
 * continua subindo, porque aí a busca textual também falharia.
 */
@Injectable()
export class SearchProductsUseCase {
  private readonly logger = new Logger(SearchProductsUseCase.name);

  constructor(
    @Inject('IEmbeddingService')
    private readonly embeddingService: IEmbeddingService,
    @Inject('IProductChunkRepository')
    private readonly chunkRepository: IProductChunkRepository,
    @Inject('IProductRepository')
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(query: string, limit: number): Promise<ProductSearchResult> {
    if (!this.embeddingService.isConfigured()) {
      return this.textSearch(query, limit, 'embedding-not-configured');
    }

    try {
      return { mode: 'semantic', results: await this.semanticSearch(query, limit) };
    } catch (error) {
      this.logger.warn(
        `Busca semântica falhou, caindo para textual: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.textSearch(query, limit, 'semantic-search-failed');
    }
  }

  private async semanticSearch(
    query: string,
    limit: number,
  ): Promise<ProductSearchHit[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const chunks = await this.chunkRepository.searchSimilar(queryEmbedding, limit);

    return (
      chunks
        // O modo textual filtra inativo no SQL. O chunk guarda o estado de
        // quando foi indexado, então a mesma regra vale aqui.
        .filter((chunk) => chunk.metadata?.isActive !== false)
        .map((chunk) => ({
          productId: chunk.productId,
          productCode: chunk.productCode,
          productName: chunk.productName,
          similarity:
            Math.round(
              cosineSimilarity(queryEmbedding, chunk.getEmbeddingVector()) *
                100,
            ) / 100,
          image: chunk.metadata?.realImage ?? null,
          metadata: toPublicSearchMetadata(chunk.metadata),
        }))
    );
  }

  private async textSearch(
    query: string,
    limit: number,
    fallbackReason: SearchFallbackReason,
  ): Promise<ProductSearchResult> {
    const products = await this.productRepository.searchByText(query, limit);

    return {
      mode: 'text',
      fallbackReason,
      results: products.map((product) => ({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        similarity: null,
        image: product.realImage ?? null,
        metadata: toPublicSearchMetadata(product),
      })),
    };
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Dimensão do embedding da consulta (${a.length}) difere da do catálogo (${b.length})`,
    );
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
