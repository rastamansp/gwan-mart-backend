/**
 * Estado observado do provedor de embedding, para o health.
 *
 * Não é uma sonda: o health não chama o provedor (seria gasto pago a cada
 * verificação). É o resultado da última chamada real.
 */
export interface EmbeddingProviderStatus {
  /** Há chave do provedor no ambiente. Sem ela a busca cai para textual. */
  configured: boolean;
  /** Mensagem da última falha, se a chamada mais recente falhou. */
  lastError?: string;
  /** Quando a última falha aconteceu (ISO 8601). */
  lastErrorAt?: string;
}

export interface IEmbeddingService {
  /**
   * Gera um embedding vetorial para um texto usando OpenAI
   * @param text Texto para gerar embedding
   * @returns Array de números representando o embedding vetorial
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Retorna a dimensão dos embeddings gerados
   * @returns Dimensão do vetor de embedding
   */
  getEmbeddingDimension(): number;

  /**
   * Retorna o modelo usado para gerar embeddings
   * @returns Nome do modelo (ex: "text-embedding-3-small")
   */
  getModel(): string;

  /**
   * Se há provedor configurado. A chave é opcional neste app (o chat pode ser
   * Claude), então quem depende de embedding precisa ter um caminho sem ele.
   */
  isConfigured(): boolean;

  /** Estado da última chamada ao provedor — consumido pelo health. */
  getStatus(): EmbeddingProviderStatus;
}
