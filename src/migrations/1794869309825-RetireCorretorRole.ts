import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aposenta o papel CORRETOR, herdado do fork do gwan-imoveis-backend (issue #6).
 *
 * Os papéis do Mart passam a ser só USER e ADMIN — ADMIN é o administrador do
 * catálogo (design D1 da change `remove-imoveis-fork-residue`). O que esta
 * migration faz com quem ainda carrega o papel antigo:
 *
 * - **CORRETOR vira USER, não ADMIN** (D2). No Mart o CORRETOR só podia escrever
 *   no catálogo; virar ADMIN daria a ele também a gestão de usuários (listar,
 *   apagar, promover). Rebaixar é recuperável com uma chamada de quem é ADMIN
 *   (`PUT /users/:id/promote`); escalar em silêncio não é desfazível por ninguém
 *   que não saiba que aconteceu.
 * - **Nada some sem registro**: cada conta rebaixada fica em
 *   `user_role_transitions` (id, papel anterior, papel novo, quando), e a
 *   migration escreve no log quantas foram e quais ids. A tabela só é criada
 *   quando há conta a rebaixar — banco que nunca teve CORRETOR não ganha um
 *   artefato da transição.
 * - Qualquer outro rótulo fora de USER/ADMIN (o ORGANIZER que a migration
 *   `MigrateOrganizerToCorretor` não conseguia tirar do enum, num banco herdado)
 *   recebe o mesmo tratamento.
 * - O tipo `users_role_enum` é recriado só com USER e ADMIN — o PostgreSQL não
 *   remove valor de enum, então o caminho é o mesmo que o `migration:generate`
 *   do TypeORM produz: renomear, criar o novo, converter a coluna, apagar o
 *   antigo.
 *
 * Token já emitido não precisa de transição: a `JwtStrategy` relê o usuário do
 * banco a cada requisição, então o papel que vale é o da linha, nunca o do token.
 *
 * `down` recria o enum com CORRETOR e devolve o papel a quem a migration
 * rebaixou — desde que a conta ainda esteja como USER (quem foi promovido a
 * ADMIN depois não é rebaixado pelo rollback).
 */
export class RetireCorretorRole1794869309825 implements MigrationInterface {
  name = 'RetireCorretorRole1794869309825';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const legados: Array<{ id: string; role: string }> = await queryRunner.query(
      `SELECT "id", "role"::text AS "role" FROM "users" WHERE "role"::text NOT IN ('USER', 'ADMIN') ORDER BY "id"`,
    );

    if (legados.length > 0) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "user_role_transitions" (
          "userId" uuid NOT NULL,
          "previousRole" character varying(50) NOT NULL,
          "newRole" character varying(50) NOT NULL,
          "migratedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_user_role_transitions" PRIMARY KEY ("userId"),
          CONSTRAINT "FK_user_role_transitions_user" FOREIGN KEY ("userId")
            REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(`
        INSERT INTO "user_role_transitions" ("userId", "previousRole", "newRole")
        SELECT "id", "role"::text, 'USER' FROM "users"
        WHERE "role"::text NOT IN ('USER', 'ADMIN')
        ON CONFLICT ("userId") DO NOTHING
      `);
      await queryRunner.query(`UPDATE "users" SET "role" = 'USER' WHERE "role"::text NOT IN ('USER', 'ADMIN')`);

      console.warn(
        `[RetireCorretorRole] ${legados.length} conta(s) com papel aposentado passaram a USER ` +
          `e perderam a escrita no catálogo. Registro em "user_role_transitions". ` +
          `Para devolver o acesso: PUT /users/:id/promote com {"targetRole":"ADMIN"}. ` +
          `Contas: ${legados.map((u) => `${u.id} (${u.role})`).join(', ')}`,
      );
    }

    await this.recriarEnum(queryRunner, ['USER', 'ADMIN']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.recriarEnum(queryRunner, ['USER', 'ADMIN', 'CORRETOR']);

    if (await queryRunner.hasTable('user_role_transitions')) {
      await queryRunner.query(`
        UPDATE "users" u SET "role" = 'CORRETOR'
        FROM "user_role_transitions" t
        WHERE t."userId" = u."id" AND t."previousRole" = 'CORRETOR' AND u."role" = 'USER'
      `);
      await queryRunner.query(`DROP TABLE "user_role_transitions"`);
    }
  }

  private async recriarEnum(queryRunner: QueryRunner, valores: string[]): Promise<void> {
    const lista = valores.map((v) => `'${v}'`).join(', ');
    await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM(${lista})`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::text::"public"."users_role_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }
}
