import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../shared/domain/value-objects/user-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Papéis aceitos pela rota (ou por todas as rotas do controller).
 *
 * Só tem efeito junto do `RolesGuard`, e o `RolesGuard` só tem o que ler depois
 * do `JwtAuthGuard` — por isso a ordem é sempre
 * `@UseGuards(JwtAuthGuard, RolesGuard)`: sem credencial a resposta é 401, e só
 * com credencial de papel errado é 403.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
