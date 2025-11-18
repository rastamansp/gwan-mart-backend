import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para extrair ou gerar um Request ID
 * 
 * Extrai o request ID do header 'x-request-id' se existir,
 * caso contrário, gera um novo ID único para a requisição.
 * 
 * @example
 * ```typescript
 * async getProducts(@RequestId() requestId: string) {
 *   console.log(`Request ID: ${requestId}`);
 * }
 * ```
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    // Tentar obter do header
    const headerRequestId = request.headers['x-request-id'] || 
                          request.headers['x-request-id'] ||
                          request.headers['X-Request-Id'];
    
    if (headerRequestId) {
      return String(headerRequestId);
    }
    
    // Se não existir no header, gerar um novo ID único
    // Usar timestamp + random para garantir unicidade
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const generatedId = `req-${timestamp}-${random}`;
    
    // Armazenar no request para uso posterior
    request.requestId = generatedId;
    
    return generatedId;
  },
);

