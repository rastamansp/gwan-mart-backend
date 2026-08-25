import { DataSource } from 'typeorm';
import { User } from '../src/shared/domain/entities/user.entity';
import { UserRole } from '../src/shared/domain/value-objects/user-role.enum';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function createAdmin() {
  console.log('🚀 Iniciando criação do usuário ADMIN...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: (() => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL não configurada. Defina a variável antes de rodar este script — não há fallback (o antigo apontava para um banco de produção com senha no código).');
    }
    return url;
  })(),
    entities: [User],
    synchronize: false,
    logging: true,
    ssl: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ DataSource inicializado com sucesso');

    const userRepository = dataSource.getRepository(User);

    // Verificar se o admin já existe (e-mail configurável; gwan.com.br é legado)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gwan.cloud';
    const existingAdmin = await userRepository.findOne({ 
      where: { email: adminEmail } 
    });

    if (existingAdmin) {
      console.log('⚠️ Usuário ADMIN já existe:', {
        id: existingAdmin.id,
        email: existingAdmin.email,
        role: existingAdmin.role,
      });
      return;
    }

    // Criar usuário ADMIN
    // Senha vem de env. A anterior era literal no codigo e publicada junto com
    // o repositorio — um admin criado com ela ja nasce comprometido.
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 12) {
      throw new Error(
        'ADMIN_PASSWORD não configurada (mínimo 12 caracteres). Defina antes de criar o administrador.',
      );
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = User.create(
      uuidv4(),
      'Administrador do Sistema',
      adminEmail,
      hashedPassword,
      '+5511999999999',
      UserRole.ADMIN
    );

    const savedAdmin = await userRepository.save(adminUser);
    
    console.log('✅ Usuário ADMIN criado com sucesso:', {
      id: savedAdmin.id,
      email: savedAdmin.email,
      name: savedAdmin.name,
      role: savedAdmin.role,
      createdAt: savedAdmin.createdAt,
    });

    console.log('🔑 Credenciais do ADMIN:');
    console.log(`   Email: ${adminEmail}`);
    console.log('   Senha: a definida em ADMIN_PASSWORD');
    console.log('   Role: ADMIN');

  } catch (error) {
    console.error('❌ Erro ao criar usuário ADMIN:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 DataSource desconectado');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createAdmin()
    .then(() => {
      console.log('🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro na execução do script:', error);
      process.exit(1);
    });
}

export { createAdmin };
