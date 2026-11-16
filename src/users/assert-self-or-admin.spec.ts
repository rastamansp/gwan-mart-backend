import { ForbiddenException } from '@nestjs/common';
import { assertSelfOrAdmin } from './assert-self-or-admin';
import { UserRole } from '../shared/domain/value-objects/user-role.enum';

describe('assertSelfOrAdmin', () => {
  const eu = { id: 'u-1', role: UserRole.USER };

  it('libera o próprio usuário', () => {
    expect(() => assertSelfOrAdmin(eu, 'u-1')).not.toThrow();
  });

  it('recusa usuário comum sobre outro cadastro', () => {
    expect(() => assertSelfOrAdmin(eu, 'u-2')).toThrow(ForbiddenException);
  });

  it('recusa papel desconhecido (ex.: o CORRETOR aposentado) sobre outro cadastro', () => {
    expect(() => assertSelfOrAdmin({ id: 'c-1', role: 'CORRETOR' }, 'u-2')).toThrow(
      ForbiddenException,
    );
  });

  it('libera ADMIN sobre qualquer cadastro', () => {
    expect(() => assertSelfOrAdmin({ id: 'a-1', role: UserRole.ADMIN }, 'u-2')).not.toThrow();
  });

  it('recusa quando não há usuário na requisição', () => {
    expect(() => assertSelfOrAdmin(undefined, 'u-1')).toThrow(ForbiddenException);
  });
});
