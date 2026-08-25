# Proposal — secure-catalog-write-endpoints

## Why

Três rotas do catálogo escrevem no banco ou gastam crédito de IA **sem nenhuma autenticação**:

| Rota | O que faz | Guard |
|---|---|---|
| `POST /api/products/import` | importa produtos em lote | nenhum — e o Swagger anuncia "Não requer autenticação" |
| `POST /api/products/catalog/update/:id` | reprocessa o catálogo/embeddings do produto | nenhum |
| `POST /api/products/search/similar` | gera embedding da consulta (chamada paga à OpenAI) | nenhum |

As irmãs delas (`POST /products`, `PUT /products/:id`, `DELETE /products/:id`) têm
`@UseGuards(JwtAuthGuard)`. A assimetria não é uma decisão de produto: `import` foi escrito
para migração de dados e ficou aberto.

Enquanto o Mart está só em dev isso é inofensivo. No dia em que a stack subir com a API
exposta pelo Traefik, qualquer um na internet pode inserir produtos arbitrários na vitrine
(que é pública, dentro do site institucional) e queimar a chave de embeddings do mantenedor em
loop. É o tipo de coisa que precisa estar fechada **antes** do primeiro deploy, não depois.

## What Changes

- **`POST /products/import` exige autenticação** e papel administrativo — é a rota mais
  destrutiva do módulo (escrita em lote, sem revisão).
- **`POST /products/catalog/update/:id` exige autenticação**, pelo mesmo motivo de
  `PUT /products/:id`, que já exige.
- **`POST /products/search/similar` deixa de ser anônima e ilimitada**: ou exige
  autenticação, ou ganha limite por IP — a decisão depende de o chat público precisar dela.
  O ponto inegociável é que uma chamada anônima não dispare gasto ilimitado na API de
  embeddings.
- **Swagger deixa de anunciar rota aberta**: a descrição de `import` é corrigida e as rotas
  ganham `@ApiBearerAuth()`.
- **Papéis levados a sério**: hoje o guard é só `JwtAuthGuard` (qualquer usuário logado
  escreve no catálogo). Escrita de catálogo passa a exigir papel administrativo, com o
  `RolesGuard` que já existe em `src/auth/guards`.

**Fora de escopo:** redesenhar o modelo de papéis (o `ORGANIZER` herdado do fork é assunto da
change de resíduo) e rate limit geral da API.

## Capabilities

### Added Capabilities
- `catalog-write-access`: quem pode alterar o catálogo e quem pode disparar operação paga de
  IA passa a ser regra explícita, verificável rota a rota.

## Impact

- **`src/products/infra/products.controller.ts`**: guards e decorators de Swagger nas 3 rotas.
- **`src/auth/guards`**: uso do `RolesGuard` existente (sem código novo de auth, se ele já
  cobrir o caso).
- **Front (`gwan-ia`)**: a tela de admin de produtos já autentica? Se o import for usado por
  lá, precisa mandar o token — verificar `useProductAdmin.ts` antes de fechar.
- **Risco de regressão**: baixo. Nenhuma dessas rotas é usada pela vitrine pública nem pelo
  loop de tool_calls do chat (que só lê).
