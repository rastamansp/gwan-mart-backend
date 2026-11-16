import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../shared/domain/value-objects/user-role.enum';
import { ROLES_KEY } from './roles.decorator';

/**
 * Exige que `req.user.role` esteja entre os papéis de `@Roles(...)`.
 *
 * O papel lido é o do usuário que a `JwtStrategy` acabou de reler do banco, e
 * não o que está gravado no token: promover ou rebaixar alguém vale na próxima
 * requisição, sem esperar o token expirar.
 *
 * Rota sem `@Roles` passa — o guard só restringe onde alguém declarou a regra.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest().user;
    if (!user) {
      return false;
    }

    return required.includes(user.role);
  }
}
