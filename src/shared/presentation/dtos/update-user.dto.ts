import { IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ 
    description: 'Nome completo do usuário',
    example: 'João Silva Santos',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Endereço de email do usuário',
    example: 'joao.silva@email.com',
    format: 'email'
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email deve ser um endereço de email válido' })
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Telefone do usuário',
    example: '11999999999',
    pattern: '^[0-9]{10,11}$'
  })
  @IsOptional()
  @IsString()
  phone?: string;

  // Sem papel: a edição de cadastro não troca papel, nem quando feita por
  // ADMIN. O único caminho é PUT /users/:id/promote. Com forbidNonWhitelisted
  // no ValidationPipe global, um corpo com papel responde 400.
}
