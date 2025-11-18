import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../shared/domain/entities/user.entity';
import { UserRole } from '../shared/domain/value-objects/user-role.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseSeeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Criar usuário admin
    await this.createAdminUser();
    
    // Criar usuário vendedor
    await this.createCorretorUser();
    
    // Criar usuário comum
    await this.createRegularUser();

    // Criar usuário de teste (joao@email.com)
    await this.createTestUser();

    console.log('✅ Seed do banco de dados concluído!');
  }

  private async createAdminUser(): Promise<void> {
    const existingAdmin = await this.userRepository.findOne({ 
      where: { email: 'admin@gwan.com.br' } 
    });
    
    if (!existingAdmin) {
      const adminUser = User.create(
        'admin-user-id',
        'Administrador do Sistema',
        'admin@gwan.com.br',
        await bcrypt.hash('admin123', 10),
        '+5511999999999',
        UserRole.ADMIN,
      );
      
      await this.userRepository.save(adminUser);
      console.log('👤 Usuário admin criado');
    }
  }

  private async createCorretorUser(): Promise<void> {
    const existingCorretor = await this.userRepository.findOne({ 
      where: { email: 'vendedor@gwan.com.br' } 
    });
    
    if (!existingCorretor) {
      const corretorUser = User.create(
        'vendedor-user-id',
        'João Silva Vendedor',
        'vendedor@gwan.com.br',
        await bcrypt.hash('corretor123', 10),
        '+5511888888888',
        UserRole.CORRETOR,
      );
      
      await this.userRepository.save(corretorUser);
      console.log('👤 Usuário vendedor criado');
    }
  }

  private async createRegularUser(): Promise<void> {
    const existingUser = await this.userRepository.findOne({ 
      where: { email: 'usuario@gwan.com.br' } 
    });
    
    if (!existingUser) {
      const regularUser = User.create(
        'regular-user-id',
        'Maria Santos',
        'usuario@gwan.com.br',
        await bcrypt.hash('usuario123', 10),
        '+5511777777777',
        UserRole.USER,
      );
      
      await this.userRepository.save(regularUser);
      console.log('👤 Usuário comum criado');
    }
  }

  private async createTestUser(): Promise<void> {
    const existingUser = await this.userRepository.findOne({ 
      where: { email: 'joao@email.com' } 
    });
    
    if (!existingUser) {
      const testUser = User.create(
        'test-user-id',
        'João Silva',
        'joao@email.com',
        await bcrypt.hash('senha123', 10),
        '+5511666666666',
        UserRole.USER,
      );
      
      await this.userRepository.save(testUser);
      console.log('👤 Usuário de teste criado (joao@email.com / senha123)');
    } else {
      console.log('👤 Usuário de teste já existe');
    }
  }

}
