import { RegisterUserUseCase } from './register-user.use-case';
import { IUserRepository } from '../../domain/interfaces/user-repository.interface';
import { ILogger } from '../interfaces/logger.interface';
import { User } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/value-objects/user-role.enum';
import { RegisterDto } from '../../../auth/dto/register.dto';

describe('RegisterUserUseCase', () => {
  let salvos: User[];
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    salvos = [];
    const repo: Partial<IUserRepository> = {
      findByEmail: async () => null,
      save: async (user: User) => {
        salvos.push(user);
        return user;
      },
    };
    const logger: ILogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
    useCase = new RegisterUserUseCase(repo as IUserRepository, logger);
  });

  const cadastro = { name: 'Fulano', email: 'fulano@test.local', password: 'senha123456' };

  it('cria o usuário com papel USER', async () => {
    const user = await useCase.execute(cadastro as RegisterDto);
    expect(user.role).toBe(UserRole.USER);
  });

  it('ignora papel que chegue no objeto, mesmo que o DTO volte a aceitá-lo', async () => {
    // O ValidationPipe recusa esse corpo antes de chegar aqui; o teste cobre a
    // segunda linha de defesa, caso o campo reapareça no RegisterDto.
    const comPapel = { ...cadastro, role: UserRole.ADMIN } as unknown as RegisterDto;
    const user = await useCase.execute(comPapel);
    expect(user.role).toBe(UserRole.USER);
    expect(salvos[0].role).toBe(UserRole.USER);
  });

  it('não grava a senha em texto puro', async () => {
    const user = await useCase.execute(cadastro as RegisterDto);
    expect(user.password).not.toBe(cadastro.password);
  });
});
