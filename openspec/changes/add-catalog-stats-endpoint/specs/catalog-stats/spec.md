## ADDED Requirements

### Requirement: Resumo agregado do catálogo
A API SHALL expor `GET /products/stats`, público e somente leitura, que devolve o resumo do
catálogo calculado no banco por consulta agregada, sem carregar os produtos na aplicação. O
resumo SHALL conter `available` (produtos ativos com estoque maior que zero), `categoryCount`,
`categories` (lista de `{ name, count }`), `averageRating` e `totalReviews`. Produtos excluídos
(soft delete) NÃO SHALL entrar em nenhuma métrica.

#### Scenario: Produto ativo sem estoque
- **WHEN** um produto está ativo e com `stock = 0`
- **THEN** ele não conta em `available`, mas sua categoria aparece em `categories`

#### Scenario: Produto inativo
- **WHEN** um produto está inativo
- **THEN** ele não conta em `available` nem em `count` de nenhuma categoria

#### Scenario: Rota não é confundida com código de produto
- **WHEN** o cliente chama `GET /products/stats`
- **THEN** recebe o resumo, e não a busca de um produto de código `stats`

### Requirement: Categorias com produto ativo
`categories` SHALL listar cada categoria não vazia que tenha ao menos um produto ativo, com
`count` igual ao número de produtos ativos nela, ordenada por nome. `categoryCount` SHALL ser o
tamanho dessa lista.

#### Scenario: Categoria só com produtos inativos
- **WHEN** todos os produtos de uma categoria estão inativos
- **THEN** a categoria não aparece em `categories` nem conta em `categoryCount`

#### Scenario: Categoria vazia
- **WHEN** um produto ativo tem categoria vazia
- **THEN** nenhuma entrada sem nome aparece em `categories`

### Requirement: Avaliação média ponderada no resumo
`averageRating` SHALL ser `Σ(averageRating × totalReviews) / Σ totalReviews` sobre os produtos
não excluídos com `totalReviews > 0` e `averageRating > 0`, e `totalReviews` SHALL ser o
denominador dessa média. Sem produto avaliado, `averageRating` SHALL ser `null` (nunca `0`) e
`totalReviews` SHALL ser `0`.

#### Scenario: Catálogo sem avaliações
- **WHEN** nenhum produto tem avaliação registrada
- **THEN** `averageRating` é `null` e `totalReviews` é `0`

#### Scenario: Produto com nota e sem avaliações
- **WHEN** um produto tem `averageRating > 0` mas `totalReviews = 0`
- **THEN** ele não influencia a média
