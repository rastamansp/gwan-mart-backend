import { ConfigService } from '@nestjs/config';

/**
 * Fonte unica do segredo de assinatura do JWT.
 *
 * Duas regras vivem aqui para nao se perderem de novo:
 *
 * 1. O segredo e lido do ConfigService (depois do .env carregado), nunca de
 *    `process.env` na importacao do modulo. Ler cedo demais foi o que fez o
 *    emissor e o verificador usarem segredos diferentes, quebrando 100% das
 *    rotas autenticadas.
 * 2. Nao ha fallback. O valor `'pazdedeus'` que existia aqui esta publicado no
 *    repositorio: qualquer pessoa com acesso ao codigo forjaria um token de
 *    ADMIN num ambiente onde JWT_SECRET nao estivesse definida. Faltando a
 *    variavel, a aplicacao NAO sobe.
 */
export function resolveJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET não configurada. Defina a variável de ambiente antes de iniciar a aplicação — ' +
        'não existe segredo padrão (ver .env.example).',
    );
  }

  return secret;
}
