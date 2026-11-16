import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ProductsController } from './products.controller';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { ROLES_KEY } from '@/auth/guards/roles.decorator';
import { UserRole } from '@/shared/domain/value-objects/user-role.enum';

/**
 * Toda escrita no catálogo exige ADMIN (issue #6, que trocou o
 * `CorretorOrAdminGuard` por `@Roles`). O teste varre o controller em vez de
 * listar rotas à mão: uma rota de escrita nova que esqueça o papel quebra aqui,
 * e não em produção.
 *
 * Únicas escritas HTTP abertas de propósito, cada uma com o motivo:
 * - `POST /products/search/similar`: é leitura (busca semântica) com corpo; a
 *   vitrine pública chama sem token, e o custo é contido por limite por IP
 *   (`secure-catalog-write-endpoints`, D2.3).
 */
const ESCRITAS_PUBLICAS = new Set(['POST search/similar']);

const ESCRITA = new Set([RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE]);

function rotas() {
  const proto = ProductsController.prototype as unknown as Record<string, unknown>;
  return Object.getOwnPropertyNames(proto)
    .filter((nome) => nome !== 'constructor' && typeof proto[nome] === 'function')
    .map((nome) => {
      const handler = proto[nome] as object;
      const metodo = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
      const caminho = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      return { nome, handler, metodo, chave: `${RequestMethod[metodo as number]} ${caminho}` };
    })
    .filter((r) => r.metodo !== undefined && ESCRITA.has(r.metodo));
}

describe('ProductsController — papel exigido na escrita', () => {
  const escritas = rotas().filter((r) => !ESCRITAS_PUBLICAS.has(r.chave));

  it('encontra as rotas de escrita (o teste não passa vazio)', () => {
    expect(escritas.map((r) => r.chave).sort()).toEqual(
      expect.arrayContaining(['POST /', 'POST import', 'PUT :id', 'DELETE :id', 'POST catalog/update/:id']),
    );
  });

  it.each(rotas().filter((r) => !ESCRITAS_PUBLICAS.has(r.chave)).map((r) => [r.chave, r]))(
    '%s exige JwtAuthGuard + RolesGuard com papel ADMIN',
    (_chave, rota) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, rota.handler) ?? [];
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
      expect(Reflect.getMetadata(ROLES_KEY, rota.handler)).toEqual([UserRole.ADMIN]);
    },
  );
});
