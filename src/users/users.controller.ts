import { Controller, Get, Put, Delete, Body, Param, UseGuards, Request, UseFilters, Inject, HttpCode, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { IUserRepository } from '../shared/domain/interfaces/user-repository.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { assertSelfOrAdmin } from './assert-self-or-admin';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiOkResponse, ApiExtraModels } from '@nestjs/swagger';
import { PromoteUserUseCase } from '../shared/application/use-cases/promote-user.use-case';
import { PromoteUserDto } from '../shared/presentation/dtos/promote-user.dto';
import { UpdateUserDto } from '../shared/presentation/dtos/update-user.dto';
import { InsufficientPermissionsFilter } from '../shared/presentation/filters/insufficient-permissions.filter';
import { UserRole } from '../shared/domain/value-objects/user-role.enum';
import { UserResponseDto } from '../shared/presentation/dtos/user-response.dto';

// ParseUUIDPipe nos :id: identificador que não é UUID respondia 500 (erro de
// sintaxe do PostgreSQL); agora é 400.
@ApiTags('Usuários')
@Controller('users')
// JwtAuthGuard antes do RolesGuard: sem credencial é 401; com credencial de
// papel errado é 403. Rotas sem @Roles passam pelo RolesGuard e ficam com a
// regra "próprio cadastro ou ADMIN", aplicada no handler.
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly promoteUserUseCase: PromoteUserUseCase,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar todos os usuários',
    description: 'Retorna uma lista completa de todos os usuários cadastrados no sistema. Exclusivo de ADMIN.'
  })
  @ApiOkResponse({ 
    description: 'Lista de usuários obtida com sucesso',
    type: [UserResponseDto],
    schema: {
      example: [
        {
          id: 'd4da01e3-2f5a-4edf-8fa3-71f262e04eb5',
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '11999999999',
          role: 'USER',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado - Token JWT inválido ou ausente' })
  @ApiResponse({ status: 403, description: 'Permissão negada - Apenas ADMIN lista usuários' })
  @ApiExtraModels(UserResponseDto)
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map(user => UserResponseDto.fromEntity(user));
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obter usuário por ID',
    description: 'Retorna os dados de um usuário identificado pelo UUID. O próprio usuário lê o seu cadastro; o de outro usuário, só ADMIN.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID do usuário',
    example: 'd4da01e3-2f5a-4edf-8fa3-71f262e04eb5',
    type: String 
  })
  @ApiOkResponse({ 
    description: 'Usuário obtido com sucesso',
    type: UserResponseDto,
    schema: {
      example: {
        id: 'd4da01e3-2f5a-4edf-8fa3-71f262e04eb5',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '11999999999',
        role: 'USER',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado - Token JWT inválido ou ausente' })
  @ApiResponse({ status: 403, description: 'Permissão negada - Usuário comum só lê o próprio cadastro' })
  @ApiResponse({ status: 400, description: 'Identificador não é UUID' })
  @ApiExtraModels(UserResponseDto)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any): Promise<UserResponseDto> {
    // Antes da busca: usuário comum recebe 403 para id alheio, exista ou não.
    assertSelfOrAdmin(req.user, id);
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return UserResponseDto.fromEntity(user);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Atualizar usuário',
    description: 'Atualiza nome, e-mail e telefone. Apenas os campos enviados serão atualizados. O próprio usuário edita o seu cadastro; o de outro usuário, só ADMIN. Papel não muda por aqui (corpo com papel responde 400): use PUT /users/:id/promote.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID do usuário a ser atualizado',
    example: 'd4da01e3-2f5a-4edf-8fa3-71f262e04eb5',
    type: String 
  })
  @ApiBody({ 
    type: UpdateUserDto,
    description: 'Dados do usuário a serem atualizados',
    examples: {
      atualizarNome: {
        summary: 'Atualizar apenas o nome',
        value: {
          name: 'João Silva Santos'
        }
      },
      atualizarTelefone: {
        summary: 'Atualizar telefone',
        value: {
          phone: '11987654321'
        }
      },
      atualizacaoCompleta: {
        summary: 'Atualização completa',
        value: {
          name: 'João Silva Santos',
          email: 'joao.santos@email.com',
          phone: '11987654321'
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Usuário atualizado com sucesso',
    type: UserResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos - Validação falhou, inclusive corpo com papel' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado - Token JWT inválido ou ausente' })
  @ApiResponse({ status: 403, description: 'Permissão negada - Usuário comum só edita o próprio cadastro' })
  @ApiExtraModels(UpdateUserDto, UserResponseDto)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() userData: UpdateUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    assertSelfOrAdmin(req.user, id);
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Cópia campo a campo, e não Object.assign: um campo novo no DTO não vira
    // campo gravável sem alguém decidir isso aqui (design D4).
    if (userData.name !== undefined) user.name = userData.name;
    if (userData.email !== undefined) user.email = userData.email;
    if (userData.phone !== undefined) user.phone = userData.phone;
    user.updatedAt = new Date();
    
    const updatedUser = await this.userRepository.update(id, user);
    return UserResponseDto.fromEntity(updatedUser);
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Deletar usuário',
    description: 'Remove um usuário do sistema permanentemente. Exclusivo de ADMIN.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID do usuário a ser deletado',
    example: 'd4da01e3-2f5a-4edf-8fa3-71f262e04eb5',
    type: String 
  })
  @ApiOkResponse({ 
    description: 'Usuário deletado com sucesso',
    schema: {
      example: {
        message: 'User deleted successfully'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autorizado - Token JWT inválido ou ausente' })
  @ApiResponse({ status: 403, description: 'Permissão negada - Apenas ADMIN pode deletar usuários' })
  @ApiResponse({ status: 400, description: 'Identificador não é UUID' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return { message: 'User deleted successfully' };
  }

  @Put(':id/promote')
  @HttpCode(200)
  // O use case também confere se quem promove é ADMIN; o guard barra antes,
  // com a mesma regra das demais rotas administrativas.
  @Roles(UserRole.ADMIN)
  @UseFilters(InsufficientPermissionsFilter)
  @ApiOperation({ 
    summary: 'Promover usuário',
    description: 'Promove um usuário a ADMIN (USER → ADMIN). Apenas ADMIN pode promover usuários. O usuário que está promovendo deve ter permissões adequadas.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID do usuário que será promovido',
    example: 'd4da01e3-2f5a-4edf-8fa3-71f262e04eb5',
    type: String 
  })
  @ApiBody({ 
    type: PromoteUserDto,
    description: 'Dados da promoção',
    examples: {
      promoverParaAdmin: {
        summary: 'Promover para Administrador',
        value: {
          targetRole: 'ADMIN'
        }
      },
      semRole: {
        summary: 'Usar role padrão (ADMIN)',
        value: {}
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Usuário promovido com sucesso',
    type: UserResponseDto,
    schema: {
      example: {
        id: 'd4da01e3-2f5a-4edf-8fa3-71f262e04eb5',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '11999999999',
        role: 'ADMIN',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-29T14:45:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Permissão insuficiente - Apenas ADMIN pode promover usuários' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos - Role inválido ou usuário já possui esse role' })
  @ApiResponse({ status: 401, description: 'Não autorizado - Token JWT inválido ou ausente' })
  @ApiExtraModels(PromoteUserDto, UserResponseDto)
  async promoteUser(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() promoteUserDto: PromoteUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    const promoterUserId = req.user.id;
    const targetRole = promoteUserDto.targetRole || UserRole.ADMIN;

    const promoted = await this.promoteUserUseCase.execute(targetUserId, promoterUserId, targetRole);
    // Pelo DTO de resposta: devolver a entidade expunha o hash bcrypt da senha.
    return UserResponseDto.fromEntity(promoted);
  }
}
