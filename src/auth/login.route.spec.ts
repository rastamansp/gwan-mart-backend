import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import {
  INVALID_CREDENTIALS_MESSAGE,
  LoginUserUseCase,
} from '../shared/application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '../shared/application/use-cases/register-user.use-case';
import { DomainExceptionFilter } from '../shared/presentation/filters/domain-exception.filter';
import { HttpExceptionFilter } from '../shared/presentation/filters/http-exception.filter';
import { User } from '../shared/domain/entities/user.entity';
import { UserRole } from '../shared/domain/value-objects/user-role.enum';

/**
 * `POST /auth/login` com credencial inválida respondia 500: o use case lançava
 * `Error` comum. Agora é 401, e com a MESMA resposta para e-mail inexistente e
 * senha errada — senão a rota diz quais e-mails têm conta.
 */
describe('POST /auth/login', () => {
  const PASSWORD = 'senha-certa-123';
  let user: User;
  let findByEmail: jest.Mock;
  let app: INestApplication;

  beforeAll(async () => {
    user = Object.assign(new User(), {
      id: 'u-1',
      name: 'Admin',
      email: 'admin@mart.test',
      password: await bcrypt.hash(PASSWORD, 10),
      role: UserRole.ADMIN,
    });
    findByEmail = jest.fn(async (email: string) =>
      email === user.email ? user : null,
    );
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        LoginUserUseCase,
        { provide: 'IUserRepository', useValue: { findByEmail } },
        { provide: 'ILogger', useValue: logger },
        { provide: RegisterUserUseCase, useValue: {} },
        { provide: JwtService, useValue: { sign: () => 'token-de-teste' } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mesmo pipe e filtros globais do main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter(), new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/auth/login').send({ email, password });

  it('senha errada responde 401', async () => {
    const response = await login(user.email, 'senha-errada-999').expect(401);
    expect(response.body.message).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  it('e-mail inexistente responde 401 com a mesma mensagem', async () => {
    const response = await login('ninguem@mart.test', 'senha-errada-999').expect(401);
    expect(response.body.message).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  it('as duas falhas são indistinguíveis pelo corpo', async () => {
    const strip = (body: Record<string, unknown>) => {
      const { timestamp: _ignored, ...rest } = body;
      return rest;
    };
    const wrongPassword = await login(user.email, 'senha-errada-999');
    const unknownEmail = await login('ninguem@mart.test', 'senha-errada-999');

    expect(wrongPassword.status).toBe(unknownEmail.status);
    expect(strip(wrongPassword.body)).toEqual(strip(unknownEmail.body));
  });

  it('usuário sem hash de senha é 401, não 500', async () => {
    findByEmail.mockResolvedValueOnce(
      Object.assign(new User(), { ...user, password: '' }),
    );
    await login(user.email, 'qualquer-coisa').expect(401);
  });

  it('credencial certa continua entrando', async () => {
    const response = await login(user.email, PASSWORD).expect(201);
    expect(response.body).toMatchObject({
      access_token: 'token-de-teste',
      user: { email: user.email, role: UserRole.ADMIN },
    });
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('banco fora continua sendo erro de servidor, não 401', async () => {
    findByEmail.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await login(user.email, PASSWORD).expect(500);
  });
});
