import { Injectable, Inject } from '@nestjs/common';
import { IEmbeddingService } from '../../application/interfaces/embedding-service.interface';

/**
 * Serviço OpenAI - Wrapper para funcionalidades da OpenAI
 * Fornece métodos para geração de embeddings usando o EmbeddingService
 */
@Injectable()
export class OpenAIService {
  constructor(
    @Inject('IEmbeddingService')
    private readonly embeddingService: IEmbeddingService,
  ) {}

  /**
   * Gera um embedding para um único texto
   * @param text Texto para gerar embedding
   * @returns Array de números representando o embedding vetorial
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingService.generateEmbedding(text);
  }

  /**
   * Gera embeddings para múltiplos textos
   * Processa em paralelo para melhor performance
   * @param texts Array de textos para gerar embeddings
   * @returns Array de arrays de números (embeddings)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Processar em paralelo para melhor performance
    const embeddingPromises = texts.map(text =>
      this.embeddingService.generateEmbedding(text),
    );

    return Promise.all(embeddingPromises);
  }

  /**
   * Retorna a dimensão dos embeddings gerados
   * @returns Dimensão do vetor de embedding
   */
  getEmbeddingDimension(): number {
    return this.embeddingService.getEmbeddingDimension();
  }

  /**
   * Retorna o modelo usado para gerar embeddings
   * @returns Nome do modelo
   */
  getModel(): string {
    return this.embeddingService.getModel();
  }
}

