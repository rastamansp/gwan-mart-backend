import { DataSource } from 'typeorm';
import { User } from '../src/shared/domain/entities/user.entity';
import { UserRole } from '../src/shared/domain/value-objects/user-role.enum';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function createTestUser() {
  console.log('🚀 Iniciando criação do usuário de teste...');
  
  const databaseUrl = (() => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL não configurada. Defina a variável antes de rodar este script — não há fallback (o antigo apontava para um banco de produção com senha no código).');
    }
    return url;
  })();

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [User],
    synchronize: false,
    logging: true,
    ssl: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ DataSource inicializado com sucesso');

    const userRepository = dataSource.getRepository(User);

    // Verificar se já existe joao@email.com
    const existingUser = await userRepository.findOne({ 
      where: { email: 'joao@email.com' } 
    });

    if (existingUser) {
      console.log('⚠️ Usuário de teste já existe:', {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      });
      return;
    }

    // Criar usuário de teste
    const hashedPassword = await bcrypt.hash('senha123', 10);
    const testUser = User.create(
      uuidv4(),
      'João Silva',
      'joao@email.com',
      hashedPassword,
      '+5511666666666',
      UserRole.USER
    );

    const savedUser = await userRepository.save(testUser);
    
    console.log('✅ Usuário de teste criado com sucesso:', {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role,
      createdAt: savedUser.createdAt,
    });

    console.log('🔑 Credenciais do usuário de teste:');
    console.log('   Email: joao@email.com');
    console.log('   Senha: senha123');
    console.log('   Role: USER');

  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 DataSource desconectado');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na execução do script:', error);
      process.exit(1);
    });
}

export { createTestUser };

