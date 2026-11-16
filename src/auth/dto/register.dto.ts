import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'usuario@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '11999999999', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  // Sem papel, de propósito: todo cadastro nasce USER. O ValidationPipe global
  // roda com forbidNonWhitelisted, então um corpo que traga papel é recusado
  // com 400 em vez de aceito. Antes, papel ADMIN neste corpo criava admin por
  // uma rota pública. Papel só muda por PUT /users/:id/promote.
}
