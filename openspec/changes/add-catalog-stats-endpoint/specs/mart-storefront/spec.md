## ADDED Requirements

### Requirement: Home resume o catálogo sem baixá-lo
A home SHALL obter os indicadores do catálogo e a lista de categorias de `GET /products/stats`.
A home NÃO SHALL chamar `GET /products/all`.

#### Scenario: Abrir a home
- **WHEN** a home é carregada
- **THEN** a única chamada de catálogo além dos destaques é `GET /products/stats`

#### Scenario: Falha no resumo
- **WHEN** `GET /products/stats` falha
- **THEN** as seções de indicadores e de categorias são omitidas e os destaques continuam
  funcionando

### Requirement: Categorias da home cobrem o catálogo ativo
A seção de categorias da home SHALL listar todas as categorias com produto ativo, e não apenas
as categorias dos produtos em destaque. Cada categoria SHALL levar ao catálogo filtrado por ela.

#### Scenario: Categoria sem produto em destaque
- **WHEN** uma categoria tem produto ativo mas nenhum em destaque
- **THEN** ela aparece na seção de categorias da home
