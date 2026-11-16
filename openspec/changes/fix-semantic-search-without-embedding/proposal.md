# Proposal — fix-semantic-search-without-embedding

## Why

A busca por similaridade do catálogo (`POST /products/search/similar`, chamada pelo botão
"✦ Buscar por similaridade" da loja) depende de `OPENAI_API_KEY` mesmo com
`AI_PROVIDER=claude`: o chat é Claude, mas o embedding da consulta é da OpenAI. Sem a chave o
`EmbeddingService` lança erro, o controller o repassa e a rota responde **500** ao visitante
(issue #12).

O mesmo vale quando a chave existe e o provedor falha (chave revogada, cota estourada, rede):
o erro de um fornecedor opcional vira erro interno para quem só queria achar um produto. E
nada na operação mostra isso — o `/api/health` não sabe que a busca por similaridade existe.

A chave é **opcional** neste app: o chat funciona sem ela, e o catálogo também deveria.

## What Changes

- **Queda para busca textual**: sem provedor de embedding configurado, ou com o provedor
  falhando em tempo de execução, a rota responde **200** com resultados de uma busca textual
  por nome, código, categoria e subcategoria — sem diferenciar maiúsculas nem acentos.
  Falha de provedor é registrada em log; nunca vira 500.
- **Modo explícito na resposta**: o corpo ganha `mode: "semantic" | "text"` (e o motivo da
  queda, quando houver). No modo textual não há grau de similaridade — `similarity` vem
  `null` em vez de um número inventado.
- **Health informa a busca por similaridade**: nova entrada `embeddings` em `dependencies`,
  no formato já usado. Sem chave ela é `disabled` e **não** rebaixa o status geral: chave
  opcional ausente é configuração, não queda. Com chave e a última chamada ao provedor
  falhando, é `down` não crítica → `degraded`, como MinIO e Redis. O health **não** chama o
  provedor (seria gasto pago a cada 30 s); reporta o resultado da última chamada real.
- **Loja**: no modo textual, a página de catálogo esconde o percentual e avisa que a busca por
  similaridade está indisponível e os resultados são por texto.

**Fora de escopo:** índice de texto (`pg_trgm`/`unaccent`) — exigiria extensão/migration; a
normalização de acento é feita com `translate()` nativo, suficiente para o tamanho atual do
catálogo. Provedor de embedding alternativo (Voyage, local).

## Capabilities

### Added Capabilities
- `product-search`: a busca do catálogo degrada para textual em vez de falhar.

### Modified Capabilities
- `service-health`: o health passa a reportar o estado da busca por similaridade.
- `mart-storefront`: a loja distingue resultado semântico de textual.

## Impact

- **`src/products/application/use-cases/search-products.use-case.ts`** (novo): decide o modo e
  faz a queda.
- **`src/products/infra/products.controller.ts`**: a rota delega ao use case.
- **`IProductRepository` / `TypeOrmProductRepository`**: novo `searchByText`.
- **`IEmbeddingService` / `EmbeddingService`**: `isConfigured()` e estado da última chamada.
- **`src/health/health.service.ts`**: entrada `embeddings` e estado `disabled`.
- **`web/src/lib/api.ts`, `web/src/pages/CatalogPage.tsx`**: modo textual.
- **Sem migration.** Recomendação para quando o catálogo crescer: `pg_trgm` + `unaccent` com
  índice GIN, em change própria.
