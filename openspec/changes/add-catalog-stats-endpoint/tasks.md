# Tasks — add-catalog-stats-endpoint

## 1. API

- [x] 1.1 `getCatalogStats()` no repositório: uma consulta agregada para contagens/média (`COUNT`/`SUM ... FILTER`) e uma `GROUP BY` para as categorias com produto ativo, ambas ignorando soft delete. **Conferido** no SQL gerado: o QueryBuilder acrescenta `"product"."deletedAt" IS NULL` nas duas
- [x] 1.2 `GetCatalogStatsUseCase`: converte os agregados (o driver devolve `numeric`/`bigint` como string), calcula a média e devolve `null` sem avaliação
- [x] 1.3 `GET /products/stats` declarado antes de `GET /products/:code`, documentado no Swagger (aparece em `/api-json` como "Resumo do catálogo"), sem `x-mcp`

## 2. Loja

- [x] 2.1 `fetchCatalogStats()` em `lib/api.ts`, substituindo o cálculo `catalogStats(products)`
- [x] 2.2 Home usa o resumo para os indicadores e para a lista de categorias (com a contagem de ativos em cada); não chama mais `/products/all`
- [x] 2.3 Falha no resumo omite indicadores e categorias sem afetar os destaques (o `catch` zera o estado; as duas seções dependem dele)

## 3. Validação

- [x] 3.1 Teste automatizado: use case (conversão, média ponderada, `null` sem avaliação, catálogo vazio) e rota (`/products/stats` não cai em `/:code`, controller real com dependências simuladas). Para o teste de rota, o jest ganhou `moduleNameMapper` do alias `@/`
- [x] 3.2 Regras do SQL conferidas contra casos de borda sem escrever no banco: as mesmas expressões sobre linhas sintéticas (`WITH ... VALUES`) — ativo sem estoque, inativo, categoria vazia/nula, nota sem avaliação, avaliação com nota 0 e excluído — deram disponível 3, média 1910/410 e categorias `A:1, B:1`, como esperado
- [x] 3.3 Endpoint chamado na API local (`:3311`) e comparado com as regras antigas aplicadas sobre `/products/all`: idêntico — 5 disponíveis, 1 categoria, média 4.592198581560283 sobre 1269 avaliações (4.6 na home). Resposta de 216 bytes contra 8.470 do `/products/all`
- [x] 3.4 `npm run lint` e `npm run build` (API), `npm run build` (`web/`) e `npm test` (14 testes) passam. O `npm run lint` de `web/` já falhava antes desta change (14 `no-undef` de `window`/`document`/`navigator`: `web/` não tem config de ESLint própria e herda o ambiente node da raiz) — nenhum aponta para código desta change
- [ ] 3.5 Home conferida em browser — não feito: o browser de automação desta máquina estava em uso por outra sessão. O módulo servido pelo Vite foi conferido (só `fetchCatalogStats`, nenhum `fetchAllProducts`)
