# Proposal — add-products-schema-migration

## Why

**Este é o bloqueador de qualquer deploy do Mart.** Não existe nenhuma migration que crie as
tabelas de produto. As duas migrations do repo (`MigrateOrganizerToCorretor`,
`RenameFieldsToEnglish`) são herança do fork do `gwan-imoveis-backend` e falam de imóveis.

Em dev nada disso aparece porque `getTypeOrmConfig` liga `synchronize` quando
`NODE_ENV !== 'production'`: o TypeORM cria as tabelas sozinho a partir das entidades. Em
produção `synchronize` é `false` — subir a stack hoje resulta numa API que passa no health
check e responde 500 em toda rota de catálogo, porque `products`, `product_images` e
`product_chunks` simplesmente não existem.

Agrava: `src/config/data-source.ts` (a DataSource que o CLI de migration usa) lista apenas as
5 entidades do imóveis — `User`, `Conversation`, `Message`, `UserCredit`, `Agent`. Mesmo
rodando `typeorm:migration:generate` hoje, o diff sairia **sem** as entidades de produto.
Consertar a DataSource é pré-requisito de gerar a migration, não um detalhe de arrumação.

## What Changes

- **`data-source.ts` passa a enxergar todas as entidades**, preferencialmente por glob
  (mesmo critério do runtime, `dist/**/*.entity.js` ↔ `src/**/*.entity.ts`), para que a lista
  não volte a divergir do `app.module.ts` na próxima entidade criada.
- **Migration inicial versionada** com o schema de produto (`products`, `product_images`,
  `product_chunks`), incluindo índices e a unicidade de `code` que o domínio já assume
  (`GET /api/products/:code` trata code como identificador).
- **Decisão explícita sobre `pgvector`**: `product_chunks` guarda embedding para a busca
  semântica. A migration precisa declarar a extensão e o tipo de coluna, ou registrar que o
  vetor fica fora do Postgres — hoje isso está implícito no `synchronize`.
- **Baseline para o banco de dev**, que já tem tabelas criadas pelo `synchronize`: a migration
  precisa ser idempotente (`IF NOT EXISTS`) ou vir com instrução de marcar como aplicada, sob
  pena de o primeiro `migration:run` local quebrar.
- **`synchronize` deixa de ser a fonte do schema em dev**: passa a valer a migration, para que
  o schema testado localmente seja o mesmo que produção vai receber.

**Fora de escopo:** seed de produtos (já existe `db:seed:products`) e qualquer mudança no
modelo de dados — a migration deve refletir as entidades como estão hoje, não redesenhá-las.

## Capabilities

### Added Capabilities
- `product-catalog-schema`: o schema do catálogo passa a ser versionado e reproduzível em
  qualquer ambiente, sem depender de `synchronize`.

## Impact

- **`src/config/data-source.ts`**: lista de entidades/migrations.
- **`src/migrations/`**: nova migration inicial do catálogo.
- **`src/config/typeorm.config.ts`**: `synchronize` desligado (ou restrito a teste).
- **Deploy**: passa a existir um passo de `migration:run` — via `docker-entrypoint.sh` ou
  `docker exec` na operação ad-hoc autorizada. Sem isso o container sobe com banco vazio.
- **Risco**: baixo em produção (não há produção), alto em dev se a migration não for
  idempotente sobre o banco já materializado pelo `synchronize`.
