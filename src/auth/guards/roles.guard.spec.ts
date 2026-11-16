import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../../shared/domain/value-objects/user-role.enum';

class SemPapel {
  rota() {}
}

class SoAdmin {
  @Roles(UserRole.ADMIN)
  rota() {}
}

@Roles(UserRole.ADMIN)
class ControllerSoAdmin {
  rota() {}
}

function contexto(alvo: any, user: unknown): ExecutionContext {
  return {
    getHandler: () => alvo.prototype.rota,
    getClass: () => alvo,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('deixa passar rota sem @Roles', () => {
    expect(guard.canActivate(contexto(SemPapel, { role: UserRole.USER }))).toBe(true);
  });

  it('recusa quando não há usuário na requisição', () => {
    expect(guard.canActivate(contexto(SoAdmin, undefined))).toBe(false);
  });

  it('recusa papel fora da lista', () => {
    expect(guard.canActivate(contexto(SoAdmin, { role: UserRole.USER }))).toBe(false);
    // Papel aposentado na #6: um registro que ainda o carregue não passa.
    expect(guard.canActivate(contexto(SoAdmin, { role: 'CORRETOR' }))).toBe(false);
  });

  it('aceita papel da lista', () => {
    expect(guard.canActivate(contexto(SoAdmin, { role: UserRole.ADMIN }))).toBe(true);
  });

  it('lê @Roles declarado no controller', () => {
    expect(guard.canActivate(contexto(ControllerSoAdmin, { role: UserRole.USER }))).toBe(false);
    expect(guard.canActivate(contexto(ControllerSoAdmin, { role: UserRole.ADMIN }))).toBe(true);
  });
});
