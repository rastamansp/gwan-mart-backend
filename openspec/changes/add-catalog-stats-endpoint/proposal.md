# Proposal — add-catalog-stats-endpoint

## Why

A change `add-real-catalog-stats` trouxe à home três indicadores honestos — produtos
disponíveis, categorias e avaliação média ponderada —, mas calculados **no navegador**: a home
chama `GET /products/all` e baixa o catálogo inteiro (com imagens e descrições) só para chegar a
três números. A própria change anotou isso como limite conhecido: o custo cresce com o catálogo
e é pago em toda visita à página mais acessada da loja (issue #9).

Há um segundo defeito no mesmo lugar: a seção **Categorias** da home é derivada dos produtos em
**destaque**. Categoria sem produto em destaque não aparece, embora o catálogo a tenha — o
visitante não descobre pela home que ela existe.

## What Changes

- **`GET /products/stats`**: resumo do catálogo calculado no PostgreSQL por SQL agregado
  (`COUNT`/`SUM ... FILTER`, `GROUP BY`), sem trafegar produto nenhum. Devolve:
  - `available` — produtos ativos com estoque;
  - `categoryCount` e `categories` — categorias com ao menos um produto **ativo**, cada uma com
    a quantidade de produtos ativos (o que o catálogo vai listar ao clicar);
  - `averageRating` — média **ponderada** pelo número de avaliações, `null` quando ninguém
    avaliou, e `totalReviews` — o total que entrou na média.
- **Regras preservadas da `add-real-catalog-stats`**, agora no banco:
  - disponível = `isActive` **e** `stock > 0`;
  - média = `Σ(nota × avaliações) / Σ avaliações`, considerando só produtos com
    `totalReviews > 0` **e** `averageRating > 0`, sobre a mesma população que `/products/all`
    devolvia (todos os produtos não excluídos, ativos ou não);
  - categoria vazia (`''`/`null`) não conta.
- **Uma regra muda, de propósito**: a contagem de categorias passa a considerar só categorias
  com produto **ativo** (antes contava qualquer produto de `/products/all`, inclusive inativo).
  O número exibido precisa bater com a lista de categorias logo abaixo, e a lista só pode
  oferecer categoria cujo link no catálogo (que filtra ativos) mostre algo.
- **Rota declarada antes de `/products/:code`**, senão `stats` seria lido como código de produto.
- **Home**: usa `/products/stats` para os indicadores **e** para a lista de categorias; deixa de
  chamar `/products/all`. Falha no endpoint esconde as duas seções sem afetar os destaques.
- **Swagger** documenta o contrato. Sem `x-mcp`: é resumo de vitrine, não ferramenta do bot.

**Fora de escopo:** `CatalogPage` (continua usando `/products/all` para os filtros), cache do
resumo (o custo é uma varredura agregada numa tabela pequena), métricas que a API não tem
(vendas, clientes).

## Capabilities

### Added Capabilities
- `catalog-stats`: resumo agregado do catálogo exposto pela API.

### Modified Capabilities
- `mart-storefront`: a home obtém indicadores e categorias do resumo, e a lista de categorias
  cobre todo o catálogo ativo, não só os destaques.

## Impact

- **API (módulo `products`)**: método `getCatalogStats()` no repositório, use case
  `GetCatalogStatsUseCase`, rota `GET /products/stats` no controller.
- **`web/src/lib/api.ts`**: `fetchCatalogStats()` substitui o cálculo `catalogStats(products)`.
- **`web/src/pages/HomePage.tsx`**: indicadores e categorias vêm do resumo.
- **Sem migration, sem mudança de schema.**
