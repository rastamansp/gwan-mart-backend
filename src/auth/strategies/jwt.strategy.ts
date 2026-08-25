import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IUserRepository } from '../../shared/domain/interfaces/user-repository.interface';
import { resolveJwtSecret } from '../jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Expiracao e verificada. O `ignoreExpiration: true` anterior ("aceitar
      // tokens de teste") fazia todo token vazado valer para sempre.
      ignoreExpiration: false,
      // Mesmo segredo que o AuthModule usa para assinar — ver jwt-secret.ts.
      secretOrKey: resolveJwtSecret(configService),
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      return null;
    }

    return user;
  }
}
