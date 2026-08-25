import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline do schema do Gwan Mart.
 *
 * Ate aqui NENHUMA tabela deste projeto tinha migration: o schema so existia
 * porque getTypeOrmConfig liga `synchronize` fora de producao. Em producao
 * `synchronize` e false — subir a stack criava uma API sem tabela alguma.
 *
 * Gerada contra um banco limpo, a partir das 8 entidades do projeto (as 3 do
 * catalogo + as 5 herdadas do fork). Cobre tipos enum, indices e as FKs de
 * imagem/chunk com ON DELETE CASCADE.
 *
 * O embedding de `product_chunks` e `text` (JSON serializado pela propria
 * entidade), nao `vector` — a busca semantica nao depende de pgvector, e por
 * isso a migration nao instala essa extensao.
 */

export class InitialSchema1787696831134 implements MigrationInterface {
    name = 'InitialSchema1787696831134'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Banco de dev que ja foi materializado pelo `synchronize` antes desta
        // migration existir: nada a criar, apenas registrar a baseline como
        // aplicada. Sem isso o primeiro `migration:run` local quebraria em
        // "relation already exists".
        if (await queryRunner.hasTable("products")) {
            return;
        }

        // uuid_generate_v4() (usado no default de toda PK uuid) exige a extensao
        // uuid-ossp. O `synchronize` a criava sozinho; a migration precisa pedir,
        // ou o primeiro deploy num Postgres limpo falha ao criar "users".
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN', 'CORRETOR')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "phone" character varying(20), "whatsappNumber" character varying(50), "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "preferredAgentId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_credits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "balance" numeric(10,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_02811227c8934f2daee2b018bb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9bea00b91b76684bcfe49a2f11" ON "user_credits" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."conversations_status_enum" AS ENUM('active', 'ended')`);
        await queryRunner.query(`CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phoneNumber" character varying(50) NOT NULL, "userId" uuid, "instanceName" character varying(100) NOT NULL, "status" "public"."conversations_status_enum" NOT NULL DEFAULT 'active', "currentAgentId" uuid, "startedAt" TIMESTAMP NOT NULL, "endedAt" TIMESTAMP, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_517acf7e04a7232adb0c760c4b" ON "conversations" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_a9b3b5d51da1c75242055338b5" ON "conversations" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_aaa0250d44f64aa858a2d132fd" ON "conversations" ("phoneNumber") `);
        await queryRunner.query(`CREATE TYPE "public"."messages_direction_enum" AS ENUM('incoming', 'outgoing')`);
        await queryRunner.query(`CREATE TYPE "public"."messages_channel_enum" AS ENUM('WEB', 'WHATSAPP')`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid NOT NULL, "phoneNumber" character varying(50), "messageId" character varying(255), "content" text NOT NULL, "direction" "public"."messages_direction_enum" NOT NULL, "agentId" uuid, "channel" "public"."messages_channel_enum", "timestamp" TIMESTAMP NOT NULL, "response" text, "toolsUsed" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_20f11fd008d289720f8f3eb6f7" ON "messages" ("channel") `);
        await queryRunner.query(`CREATE INDEX "IDX_158714265082db6af9be25aba1" ON "messages" ("phoneNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_f2113da562ea5bb1ddff44ff60" ON "messages" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_265eadada309ad6615c293da79" ON "messages" ("direction") `);
        await queryRunner.query(`CREATE INDEX "IDX_9743b3cec687ac55895f0d79ae" ON "messages" ("messageId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e5663ce0c730b2de83445e2fd1" ON "messages" ("conversationId") `);
        await queryRunner.query(`CREATE TABLE "agents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "slug" character varying(50) NOT NULL, "route" character varying(255) NOT NULL, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8086b56da2a7bd1cba714fd1c2f" UNIQUE ("slug"), CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8086b56da2a7bd1cba714fd1c2" ON "agents" ("slug") `);
        await queryRunner.query(`CREATE TABLE "product_images" ("id" SERIAL NOT NULL, "url" character varying(500) NOT NULL, "alt" character varying(255), "order" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "productId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" SERIAL NOT NULL, "code" character varying(255) NOT NULL, "description" text NOT NULL, "ncm" character varying(20) NOT NULL, "stock" integer NOT NULL DEFAULT '0', "costPrice" numeric(10,2) NOT NULL, "supplier" character varying(255) NOT NULL, "gtinEan" character varying(20) NOT NULL, "gtinEanPackage" character varying(20) NOT NULL, "supplierProductDescription" text NOT NULL, "thumbnail" character varying(500) NOT NULL, "category" character varying(255) NOT NULL, "subcategory" character varying(255) NOT NULL, "originalPrice" numeric(10,2) NOT NULL, "promotionalPrice" numeric(10,2), "discountPercentage" numeric(5,2) NOT NULL DEFAULT '0', "averageRating" numeric(3,2) NOT NULL DEFAULT '0', "totalReviews" integer NOT NULL DEFAULT '0', "variations" json, "realImage" character varying(500) NOT NULL, "name" character varying(255) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "isFeatured" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_7cfc24d6c24f0ec91294003d6b8" UNIQUE ("code"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product_chunks" ("id" SERIAL NOT NULL, "productId" integer NOT NULL, "productCode" character varying(255) NOT NULL, "productName" character varying(500) NOT NULL, "structuredText" text NOT NULL, "metadata" jsonb NOT NULL, "embedding" text NOT NULL, "type" character varying(100) NOT NULL DEFAULT 'product_catalog', "source" character varying(100) NOT NULL DEFAULT 'gwan_backend', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8336ce21c048b6836ab8b7723e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_product_chunk_product_id" ON "product_chunks" ("productId") `);
        await queryRunner.query(`CREATE INDEX "idx_product_chunk_product_code" ON "product_chunks" ("productCode") `);
        await queryRunner.query(`CREATE INDEX "idx_product_chunk_type" ON "product_chunks" ("type") `);
        await queryRunner.query(`CREATE INDEX "idx_product_chunk_source" ON "product_chunks" ("source") `);
        await queryRunner.query(`CREATE INDEX "idx_product_chunk_created_at" ON "product_chunks" ("createdAt") `);
        await queryRunner.query(`ALTER TABLE "user_credits" ADD CONSTRAINT "FK_9bea00b91b76684bcfe49a2f115" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_a9b3b5d51da1c75242055338b59" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_images" ADD CONSTRAINT "FK_b367708bf720c8dd62fc6833161" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT "FK_b367708bf720c8dd62fc6833161"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_e5663ce0c730b2de83445e2fd19"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_a9b3b5d51da1c75242055338b59"`);
        await queryRunner.query(`ALTER TABLE "user_credits" DROP CONSTRAINT "FK_9bea00b91b76684bcfe49a2f115"`);
        await queryRunner.query(`DROP INDEX "public"."idx_product_chunk_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_product_chunk_source"`);
        await queryRunner.query(`DROP INDEX "public"."idx_product_chunk_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_product_chunk_product_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_product_chunk_product_id"`);
        await queryRunner.query(`DROP TABLE "product_chunks"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "product_images"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8086b56da2a7bd1cba714fd1c2"`);
        await queryRunner.query(`DROP TABLE "agents"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5663ce0c730b2de83445e2fd1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9743b3cec687ac55895f0d79ae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_265eadada309ad6615c293da79"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f2113da562ea5bb1ddff44ff60"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_158714265082db6af9be25aba1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_20f11fd008d289720f8f3eb6f7"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TYPE "public"."messages_channel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."messages_direction_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aaa0250d44f64aa858a2d132fd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9b3b5d51da1c75242055338b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_517acf7e04a7232adb0c760c4b"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
        await queryRunner.query(`DROP TYPE "public"."conversations_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9bea00b91b76684bcfe49a2f11"`);
        await queryRunner.query(`DROP TABLE "user_credits"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
