# Tasks — add-products-schema-migration

## 1. DataSource de CLI

- [x] 1.1 `data-source.ts` passa a resolver entidades por glob (paridade com o runtime), eliminando a lista fixa de 5 entidades do fork
- [x] 1.2 Confirmar que `typeorm:migration:generate` enxerga `Product`, `ProductImage` e `ProductChunk` (diff não-vazio num banco limpo)

## 2. Migration inicial do catálogo

- [x] 2.1 Gerar a migration contra um banco **limpo** (não o de dev, já materializado pelo `synchronize`)
- [x] 2.2 Revisar o SQL gerado: tipos monetários (`costPrice` e afins) como `numeric`, não `float`; `code` único; FKs de imagem/chunk com `ON DELETE CASCADE`
- [x] 2.3 Embedding e `text` (JSON serializado pela entidade) — pgvector NAO e necessario; em compensacao a baseline cria `uuid-ossp`, que o `uuid_generate_v4()` das PKs exige e o synchronize criava sozinho
- [x] 2.4 Baseline com guarda `hasTable("products")`: em banco ja materializado pelo `synchronize` ela so se registra, sem recriar (validado no banco de dev, 5 produtos preservados)

## 3. Desligar o synchronize

- [x] 3.1 `typeorm.config.ts`: `synchronize: false` também em desenvolvimento
- [x] 3.2 Documentar no README o fluxo novo: `migration:run` antes de `start:dev` em banco novo

## 4. Validação

- [x] 4.1 Banco zerado (volume `gwan-mart-dev-postgres-data` recriado) → `migration:run` → `db:seed:products` → `GET /api/products` devolve o catálogo
- [x] 4.2 Rodar `migration:run` duas vezes seguidas sem erro
- [x] 4.3 `POST /api/chat` continua respondendo com produtos (o loop de tool_calls depende do catálogo)
