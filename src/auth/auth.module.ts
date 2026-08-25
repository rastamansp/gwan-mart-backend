import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { SharedModule } from '../shared/shared.module';
import { resolveJwtSecret } from './jwt-secret';

@Module({
  imports: [
    SharedModule,
    PassportModule,
    ConfigModule,
    // registerAsync, e nao register: o segredo precisa ser lido DEPOIS que o
    // ConfigModule carregou o .env.
    //
    // Antes, `const jwtSecret = process.env.JWT_SECRET || 'pazdedeus'` rodava na
    // importacao do arquivo — momento em que o .env ainda nao havia sido lido —,
    // entao o login assinava com o fallback enquanto a JwtStrategy (construida
    // via DI, ja com o .env carregado) verificava com o segredo real. Resultado:
    // TODO token emitido pelo proprio login era rejeitado com 401, e nenhuma
    // rota autenticada funcionava.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: resolveJwtSecret(configService),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, LocalStrategy],
})
export class AuthModule {}
