import { ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from './jwt-secret';

/**
 * Regressão do bug que deixava a autenticação inteira quebrada: o emissor lia o
 * segredo na importação do módulo (antes do .env) e caía no fallback
 * `pazdedeus`, enquanto o verificador lia o segredo real — todo token emitido
 * pelo próprio login voltava 401.
 *
 * O contrato agora é: uma fonte só, e sem fallback (o valor publicado no
 * repositório permitiria forjar token de ADMIN).
 */
describe('resolveJwtSecret', () => {
  const configWith = (value?: string) =>
    ({ get: () => value }) as unknown as ConfigService;

  it('devolve o segredo configurado', () => {
    expect(resolveJwtSecret(configWith('segredo-de-verdade'))).toBe(
      'segredo-de-verdade',
    );
  });

  it('falha quando o segredo não está configurado, em vez de usar um padrão', () => {
    expect(() => resolveJwtSecret(configWith(undefined))).toThrow(
      /JWT_SECRET não configurada/,
    );
  });

  it('trata string vazia ou em branco como ausente', () => {
    expect(() => resolveJwtSecret(configWith(''))).toThrow();
    expect(() => resolveJwtSecret(configWith('   '))).toThrow();
  });
});
