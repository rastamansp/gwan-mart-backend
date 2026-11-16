import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../shared/domain/value-objects/user-role.enum';

/**
 * Libera a operação sobre o cadastro `targetUserId` só para o próprio dono ou
 * para ADMIN; qualquer outro recebe 403.
 *
 * Fica no handler, e não num guard, porque só ele sabe qual parâmetro da rota
 * identifica o dono do recurso (design D2). Deve rodar ANTES de buscar o
 * usuário: assim um usuário comum recebe 403 para qualquer id alheio, exista
 * ele ou não, e não consegue sondar quais ids existem pela diferença 403/404.
 */
export function assertSelfOrAdmin(
  requester: { id: string; role: string } | undefined,
  targetUserId: string,
): void {
  if (!requester) {
    throw new ForbiddenException('Acesso negado');
  }
  if (requester.role === UserRole.ADMIN || requester.id === targetUserId) {
    return;
  }
  throw new ForbiddenException('Você só pode acessar o próprio cadastro');
}
