import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO base para respostas da API
 * Padroniza o formato de todas as respostas
 */
export class BaseResponseDto<T = any> {
  @ApiProperty({
    description: 'Status da resposta',
    example: 'success',
    enum: ['success', 'error'],
  })
  status: 'success' | 'error';

  @ApiPropertyOptional({
    description: 'Dados da resposta (quando status é success)',
  })
  data?: T;

  @ApiPropertyOptional({
    description: 'Objeto de erro (quando status é error)',
    type: 'object',
  })
  error?: {
    message: string;
    statusCode?: number;
    details?: any;
  };

  @ApiProperty({
    description: 'Timestamp da resposta',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  /**
   * Cria uma resposta de sucesso
   * @param data Dados a serem retornados
   * @returns BaseResponseDto com status success
   */
  static success<T>(data?: T): BaseResponseDto<T> {
    return {
      status: 'success',
      data,
      error: null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cria uma resposta de erro
   * @param message Mensagem de erro
   * @param statusCode Código de status HTTP
   * @param details Detalhes adicionais do erro
   * @returns BaseResponseDto com status error
   */
  static error(
    message: string,
    statusCode?: number,
    details?: any,
  ): BaseResponseDto {
    return {
      status: 'error',
      data: null,
      error: {
        message,
        statusCode,
        details,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

