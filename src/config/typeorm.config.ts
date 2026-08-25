import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  
  // Parse DATABASE_URL se fornecido
  let connectionOptions: any = {};
  if (databaseUrl) {
    const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
    connectionOptions = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };
  }
  
  return {
    type: 'postgres',
    ...connectionOptions,
    url: databaseUrl,
    entities: ['dist/**/*.entity.js'],
    migrations: ['dist/migrations/*.js'],
    // O schema vem de migration versionada, nunca do synchronize — inclusive em
    // dev, para que o schema testado localmente seja o mesmo que producao recebe.
    // Rode `npm run typeorm:migration:run` num banco novo antes do start.
    synchronize: false,
    logging: false, // Desabilitar logging de queries SQL
    ssl: false,  // Desabilitar SSL explicitamente
  };
};
