import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const configService = new ConfigService();

// Entidades e migrations por glob, e não por lista fixa.
//
// A lista anterior era herdada do fork do gwan-imoveis-backend e citava apenas 5
// entidades (User, Conversation, Message, UserCredit, Agent) — as 3 do catálogo
// (Product, ProductImage, ProductChunk) ficavam invisíveis para o CLI, então
// `migration:generate` produzia um diff sem o catálogo inteiro.
//
// O glob espelha o que o runtime carrega em typeorm.config.ts, para que a lista
// não volte a divergir quando uma entidade nova for criada.
const isTypeScript = __filename.endsWith('.ts');

const AppDataSource = new DataSource({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  entities: [isTypeScript ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
  migrations: [isTypeScript ? 'src/migrations/*.ts' : 'dist/migrations/*.js'],
  synchronize: false,
  logging: false, // Desabilitar logging de queries SQL
  ssl: false,
});

export default AppDataSource;
