# Tasks — add-real-catalog-stats

## 1. Cálculo

- [x] 1.1 `catalogStats(products)` em `lib/api.ts`: produtos disponíveis (ativos com estoque), categorias distintas e avaliação média **ponderada** pelo número de avaliações
- [x] 1.2 Métrica sem base retorna ausente (`null`), não zero — catálogo sem avaliação não vira "0.0"

## 2. Home

- [x] 2.1 Seção de indicadores reaproveitando `GET /products/all` (mesma chamada dos filtros do catálogo), sem requisição nova
- [x] 2.2 Indicador sem base não é renderizado; falha ao carregar omite a seção inteira, sem quebrar a home
- [x] 2.3 Rótulos honestos: "produtos disponíveis", "categorias", "avaliação média (N avaliações)" — nada de "clientes satisfeitos"

## 3. Validação

- [x] 3.1 Conferido contra `GET /products/all`: 5 disponíveis, 1 categoria, média 4.6 sobre 1269 avaliações — idêntico ao que a home exibe
- [x] 3.2 Média ponderada confere na conta manual
- [x] 3.3 `npm run build` sem erro de tipo
- [x] 3.4 Home validada em browser
