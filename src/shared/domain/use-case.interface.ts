/**
 * Interface base para Use Cases
 * Define o contrato que todos os use cases devem seguir
 * 
 * @template TInput Tipo dos dados de entrada
 * @template TOutput Tipo dos dados de saída
 */
export interface UseCase<TInput, TOutput> {
  /**
   * Executa o use case
   * @param input Dados de entrada
   * @returns Resultado do use case
   */
  execute(input: TInput): Promise<TOutput>;
}

