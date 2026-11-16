import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/interfaces/user-repository.interface';
import { ILogger } from '../interfaces/logger.interface';
import * as bcrypt from 'bcryptjs';

/**
 * Mensagem ÚNICA para e-mail inexistente e senha errada: respostas diferentes
 * diriam a quem tenta quais e-mails têm conta na loja.
 */
export const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos';

/**
 * Hash de uma senha qualquer, com o mesmo custo dos hashes reais (10). Com
 * e-mail inexistente a senha é comparada contra ele, para que a resposta leve
 * o mesmo tempo de quando o e-mail existe — sem isso, a demora do bcrypt
 * denunciaria as contas que existem, mesmo com a mensagem igual.
 */
const TIMING_EQUALIZER_HASH = bcrypt.hashSync('gwan-mart-timing-equalizer', 10);

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('ILogger')
    private readonly logger: ILogger,
  ) {}

  /**
   * Credencial inválida é 401 (`UnauthorizedException`). Antes lançava `Error`
   * comum, que o Nest responde como 500 — o visitante via "erro do servidor"
   * ao errar a senha.
   */
  async execute(email: string, password: string): Promise<User> {
    const startTime = Date.now();

    this.logger.info('Iniciando login de usuário', {
      email: email,
      timestamp: new Date().toISOString(),
    });

    let user: User | null;
    try {
      user = await this.userRepository.findByEmail(email);
    } catch (error) {
      // Erro de infraestrutura (banco fora) continua sendo 500: não é culpa
      // de quem tentou entrar, e não deve parecer senha errada.
      this.logger.error('Erro ao fazer login', {
        email: email,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }

    // Usuário sem hash (cadastro incompleto) é tratado como senha errada, em
    // vez de o bcrypt lançar e virar 500.
    const hash = user?.password || TIMING_EQUALIZER_HASH;
    const isPasswordValid = await bcrypt.compare(password ?? '', hash);

    if (!user || !user.password || !isPasswordValid) {
      this.logger.warn(
        user
          ? 'Tentativa de login com senha inválida'
          : 'Tentativa de login com email não encontrado',
        { email: email, userId: user?.id, duration: Date.now() - startTime },
      );
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    this.logger.info('Login realizado com sucesso', {
      userId: user.id,
      email: user.email,
      duration: Date.now() - startTime,
    });

    return user;
  }
}
