import { DataSource } from 'typeorm';
import { User } from '../src/shared/domain/entities/user.entity';
import { Event } from '../src/shared/domain/entities/event.entity';
import { TicketCategory } from '../src/shared/domain/entities/ticket-category.entity';
import { UserRole } from '../src/shared/domain/value-objects/user-role.enum';
import { EventStatus } from '../src/shared/domain/value-objects/event-status.enum';
import * as bcrypt from 'bcryptjs';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: (() => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL não configurada. Defina a variável antes de rodar este script — não há fallback (o antigo apontava para um banco de produção com senha no código).');
    }
    return url;
  })(),
  entities: [User, Event, TicketCategory],
  synchronize: false,
  logging: false,
});

async function runSeeder() {
  console.log('🚀 Iniciando seeder simples do banco de dados...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Conexão com banco estabelecida');

    const userRepository = AppDataSource.getRepository(User);
    const eventRepository = AppDataSource.getRepository(Event);
    const ticketCategoryRepository = AppDataSource.getRepository(TicketCategory);

    // Criar usuário admin
    const existingAdmin = await userRepository.findOne({ 
      where: { email: 'admin@gwanshop.com' } 
    });
    
    if (!existingAdmin) {
      const adminUser = User.create(
        'admin-user-id',
        'Administrador do Sistema',
        'admin@gwanshop.com',
        await bcrypt.hash('admin123', 10),
        '+5511999999999',
        UserRole.ADMIN,
      );
      
      await userRepository.save(adminUser);
      console.log('👤 Usuário admin criado');
    } else {
      console.log('👤 Usuário admin já existe');
    }

    // Criar usuário organizador
    const existingOrganizer = await userRepository.findOne({ 
      where: { email: 'organizador@gwanshop.com' } 
    });
    
    if (!existingOrganizer) {
      const organizerUser = User.create(
        'organizer-user-id',
        'João Silva Organizador',
        'organizador@gwanshop.com',
        await bcrypt.hash('organizador123', 10),
        '+5511888888888',
        UserRole.ORGANIZER,
      );
      
      await userRepository.save(organizerUser);
      console.log('👤 Usuário organizador criado');
    } else {
      console.log('👤 Usuário organizador já existe');
    }

    // Criar usuário comum
    const existingUser = await userRepository.findOne({ 
      where: { email: 'usuario@gwanshop.com' } 
    });
    
    if (!existingUser) {
      const regularUser = User.create(
        'regular-user-id',
        'Maria Santos',
        'usuario@gwanshop.com',
        await bcrypt.hash('usuario123', 10),
        '+5511777777777',
        UserRole.USER,
      );
      
      await userRepository.save(regularUser);
      console.log('👤 Usuário comum criado');
    } else {
      console.log('👤 Usuário comum já existe');
    }

    // Criar eventos
    const organizer = await userRepository.findOne({ 
      where: { email: 'organizador@gwanshop.com' } 
    });

    if (organizer) {
      // Evento 1: Festival de Música
      const existingEvent1 = await eventRepository.findOne({ 
        where: { title: 'Festival de Música Eletrônica' } 
      });
      
      if (!existingEvent1) {
        const event1 = Event.create(
          'event-1',
          'Festival de Música Eletrônica',
          'O maior festival de música eletrônica da cidade com os melhores DJs nacionais e internacionais.',
          new Date('2024-12-31T20:00:00Z'),
          'Parque da Cidade',
          'Av. das Flores, 123',
          'São Paulo',
          'SP',
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
          'Música',
          organizer.id,
          'João Silva Organizador',
          EventStatus.ACTIVE,
          5000,
          0,
        );
        
        await eventRepository.save(event1);
        console.log('🎵 Evento Festival de Música criado');

        // Criar categorias para o evento 1
        const categories1 = [
          {
            name: 'Pista',
            description: 'Acesso à área principal do evento',
            price: 150.00,
            maxQuantity: Math.floor(5000 * 0.7), // 70% da capacidade
            benefits: ['Acesso completo', 'Banheiros', 'Estacionamento'],
          },
          {
            name: 'VIP',
            description: 'Área VIP com vista privilegiada',
            price: 300.00,
            maxQuantity: Math.floor(5000 * 0.2), // 20% da capacidade
            benefits: ['Acesso VIP', 'Open bar', 'Banheiros exclusivos', 'Estacionamento VIP'],
          },
          {
            name: 'Gratuito',
            description: 'Acesso limitado ao evento',
            price: 0.00,
            maxQuantity: Math.floor(5000 * 0.1), // 10% da capacidade
            benefits: ['Acesso limitado', 'Banheiros'],
          },
        ];

        for (const categoryData of categories1) {
          const category = TicketCategory.create(
            `category-${event1.id}-${categoryData.name.toLowerCase()}`,
            event1.id,
            categoryData.name,
            categoryData.description,
            categoryData.price,
            Math.floor(categoryData.maxQuantity),
            0,
            categoryData.benefits,
            true,
          );
          
          await ticketCategoryRepository.save(category);
        }
        
        console.log(`🎫 Categorias de ingressos criadas para: ${event1.title}`);
      } else {
        console.log('🎵 Evento Festival de Música já existe');
      }

      // Evento 2: Workshop de Programação
      const existingEvent2 = await eventRepository.findOne({ 
        where: { title: 'Workshop de Programação' } 
      });
      
      if (!existingEvent2) {
        const event2 = Event.create(
          'event-2',
          'Workshop de Programação',
          'Aprenda as melhores práticas de desenvolvimento web com especialistas da área.',
          new Date('2024-11-15T09:00:00Z'),
          'Centro de Convenções',
          'Rua da Tecnologia, 456',
          'Rio de Janeiro',
          'RJ',
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
          'Educação',
          organizer.id,
          'João Silva Organizador',
          EventStatus.ACTIVE,
          200,
          0,
        );
        
        await eventRepository.save(event2);
        console.log('💻 Evento Workshop de Programação criado');

        // Criar categorias para o evento 2
        const categories2 = [
          {
            name: 'Estudante',
            description: 'Ingresso com desconto para estudantes',
            price: 50.00,
            maxQuantity: Math.floor(200 * 0.6), // 60% da capacidade
            benefits: ['Material didático', 'Certificado', 'Coffee break'],
          },
          {
            name: 'Profissional',
            description: 'Ingresso para profissionais da área',
            price: 100.00,
            maxQuantity: Math.floor(200 * 0.3), // 30% da capacidade
            benefits: ['Material completo', 'Certificado', 'Almoço', 'Networking'],
          },
          {
            name: 'Premium',
            description: 'Experiência premium com mentorias',
            price: 200.00,
            maxQuantity: Math.floor(200 * 0.1), // 10% da capacidade
            benefits: ['Mentoria 1:1', 'Material premium', 'Certificado', 'Almoço', 'Networking'],
          },
        ];

        for (const categoryData of categories2) {
          const category = TicketCategory.create(
            `category-${event2.id}-${categoryData.name.toLowerCase()}`,
            event2.id,
            categoryData.name,
            categoryData.description,
            categoryData.price,
            Math.floor(categoryData.maxQuantity),
            0,
            categoryData.benefits,
            true,
          );
          
          await ticketCategoryRepository.save(category);
        }
        
        console.log(`🎫 Categorias de ingressos criadas para: ${event2.title}`);
      } else {
        console.log('💻 Evento Workshop de Programação já existe');
      }
    }

    console.log('✅ Seeder do banco de dados concluído!');
    
  } catch (error) {
    console.error('❌ Erro ao executar seeder:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

runSeeder().catch(error => {
  console.error('❌ Erro ao executar o seeder:', error);
  process.exit(1);
});
