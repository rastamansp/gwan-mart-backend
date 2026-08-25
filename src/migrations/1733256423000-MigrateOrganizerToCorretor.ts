import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration herdada do fork do gwan-imoveis-backend: renomeia o papel ORGANIZER
 * para CORRETOR em bancos que nasceram naquele projeto.
 *
 * Nenhum banco do Gwan Mart passou por isso — aqui o schema nasce da migration
 * de baseline, cujo enum de papéis já vem do `UserRole` atual. O arquivo é
 * mantido apenas para não reescrever o histórico de bancos herdados; num banco
 * novo ele precisa ser um no-op.
 *
 * Sem a guarda abaixo, ele QUEBRA a instalação limpa: o primeiro bloco fazia
 * `ALTER TYPE users_role_enum` e o terceiro lia `FROM users` — e as duas coisas
 * rodam ANTES da baseline (timestamp menor), quando tipo e tabela ainda não
 * existem.
 */
export class MigrateOrganizerToCorretor1733256423000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) {
      // Banco novo: a baseline cria users_role_enum já com CORRETOR.
      return;
    }

    // Primeiro, verificar se o enum já tem CORRETOR, se não, adicionar
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'CORRETOR'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')
        ) THEN
          ALTER TYPE users_role_enum ADD VALUE 'CORRETOR';
        END IF;
      END $$;
    `);

    // Atualizar todos os usuários com role ORGANIZER para CORRETOR (se existir)
    // Usar CAST para evitar erro se ORGANIZER não existir mais no enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'ORGANIZER'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')
        ) THEN
          UPDATE users
          SET role = 'CORRETOR'::users_role_enum
          WHERE role::text = 'ORGANIZER';
        END IF;
      END $$;
    `);

    // Remover ORGANIZER do enum se não houver mais usuários com esse role
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM users WHERE role::text = 'ORGANIZER') THEN
          -- Não podemos remover valores de enum diretamente no PostgreSQL
          -- Isso requer recriar o enum, então apenas logamos
          RAISE NOTICE 'Role ORGANIZER removido dos dados. Para remover do enum, recrie o tipo.';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) {
      return;
    }

    // Reverter: atualizar CORRETOR de volta para ORGANIZER (se ORGANIZER existir no enum)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'ORGANIZER'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')
        ) THEN
          UPDATE users
          SET role = 'ORGANIZER'::users_role_enum
          WHERE role::text = 'CORRETOR';
        END IF;
      END $$;
    `);
  }
}
