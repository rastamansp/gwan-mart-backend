import { UserCredit } from '../entities/user-credit.entity';

// Injeção é feita pelo token string 'IUserCreditRepository' (ver shared.module.ts).
// O Symbol de mesmo nome que existia aqui nunca foi usado e colidia com a
// interface no lint.
export interface IUserCreditRepository {
  save(userCredit: UserCredit): Promise<UserCredit>;
  findById(id: string): Promise<UserCredit | null>;
  findByUserId(userId: string): Promise<UserCredit | null>;
  createOrGetByUserId(userId: string): Promise<UserCredit>;
  update(id: string, userCredit: UserCredit): Promise<UserCredit | null>;
  delete(id: string): Promise<boolean>;
}

