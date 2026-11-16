import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { UserRole } from '../shared/domain/value-objects/user-role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
// Toda a área administrativa exige ADMIN: sem credencial 401, sem o papel 403.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Não autorizado - Token JWT inválido ou ausente' })
@ApiResponse({ status: 403, description: 'Permissão negada - Exclusivo de ADMIN' })
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obter estatísticas do dashboard' })
  @ApiResponse({ status: 200, description: 'Estatísticas obtidas com sucesso' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users/:id/analytics')
  @ApiOperation({ summary: 'Obter analytics de um usuário' })
  @ApiResponse({ status: 200, description: 'Analytics obtidas com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getUserAnalytics(@Param('id') id: string) {
    return this.adminService.getUserAnalytics(id);
  }
}
