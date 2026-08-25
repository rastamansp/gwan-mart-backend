# Tasks — secure-catalog-write-endpoints

## 1. Levantamento

- [x] 1.1 `search/similar` é chamada pela **página pública de catálogo** do gwan-ia (`CatalogPage.tsx`), sem token → decisão: limite por IP, não auth
- [x] 1.2 `ProductAdminService` (gwan-ia) já envia `Authorization: Bearer` quando há sessão — fechar as rotas não quebra o admin

## 2. Fechar as rotas

- [x] 2.1 `POST /products/import`: `JwtAuthGuard` + papel administrativo + `@ApiBearerAuth()`; corrigir a descrição do Swagger que anuncia rota aberta
- [x] 2.2 `POST /products/catalog/update/:id`: mesmo tratamento de `PUT /products/:id`
- [x] 2.3 `POST /products/search/similar`: `ThrottlerGuard` com config nomeada `semantic-search` (`SEMANTIC_SEARCH_LIMIT`/`_TTL_MS`, default 10/min por IP)
- [x] 2.4 Escrita de catálogo (`POST`/`PUT`/`DELETE`/`import`) passa a exigir papel administrativo, não apenas usuário logado

## 3. Validação

- [x] 3.1 Sem token: as 3 rotas respondem 401 (e não 500)
- [x] 3.2 Com token de usuário comum: escrita de catálogo responde 403
- [x] 3.3 Com token admin: import, update de catálogo e busca similar seguem funcionando
- [x] 3.4 Vitrine pública (`GET /products`, `/featured`, `/:code`) e `POST /api/chat` continuam anônimos e funcionando

## 5. Autenticação quebrada (descoberto ao validar)

- [x] 5.1 `auth.module.ts` lia `process.env.JWT_SECRET` na **importação do arquivo**, antes do ConfigModule carregar o `.env`: assinava com o fallback `pazdedeus` enquanto a strategy verificava com o segredo real — todo token emitido pelo próprio login voltava 401
- [x] 5.2 `JwtModule.registerAsync` + `resolveJwtSecret(ConfigService)`: emissor e verificador passam a ler a mesma fonte, depois do `.env`
- [x] 5.3 Fallback `pazdedeus` removido — segredo publicado no repositório permitiria forjar token ADMIN; sem `JWT_SECRET` a aplicação não sobe
- [x] 5.4 `ignoreExpiration: true` (aceitava token vencido para sempre) passa a `false`
- [x] 5.5 Credenciais de produção hardcoded como fallback (`postgresql://postgres:pazdedeus@postgres.gwan.com.br:5433/...`) removidas de 4 scripts; `create-admin.ts` exige `ADMIN_PASSWORD` (mín. 12) em vez de senha literal
