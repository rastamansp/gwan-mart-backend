# Tasks — lock-role-assignment

Dev local: infra em `gwan-infra/apps/mart-backend/docker-compose.dev.yml` (PostgreSQL 5444,
Redis 6391, MinIO 9010), API em `:3011`. Admin de teste: `ADMIN_PASSWORD=... npm run admin:create`.

## 1. Levantamento (antes de mexer)

- [x] 1.1 Reproduzir o buraco contra a API local com `curl` e registrar a saída: `register` com `role: ADMIN` cria ADMIN; `PUT /users/<self>` com `role` promove; `GET /users` e `/admin/dashboard` dão 200 para usuário comum. Verificação: os quatro comportamentos da tabela do `proposal.md` reproduzidos (apagar os usuários de teste depois)
  - **Reproduzido em 2026-11-16** contra a API do worktree (`:3111`), código de `origin/main`: `register` com `"role":"ADMIN"` devolveu `role: ADMIN`; usuário comum fez `PUT /users/<self>` com `{"role":"ADMIN"}` e o `/auth/profile` passou a dizer `ADMIN`; `GET /users` e `GET /admin/dashboard` deram 200 para usuário comum; um usuário `USER` apagou três outros (dois deles ADMIN) com 200. Usuários de teste `smoke-roles-probe-*` apagados na mesma sonda.
- [x] 1.2 Conferir se o cadastro do `gwan-ia` (área `/gwan-mart`) envia `role` no corpo de `POST /auth/register`. Verificação: anotar o resultado aqui; se enviar, abrir issue no `gwan-ia` antes de seguir para o grupo 2
  - **Não envia.** `gwan-ia/src/services/auth.service.ts` manda `{ name, email, whatsapp }` (sem senha nem papel) para `env.API_URL` (`https://api.gwan.cloud`, o `gwan-backend`) — não para o Mart. O `gwan-ia` só fala com o Mart (`VITE_GWAN_MART_API_URL`) para ler produtos. Nada a abrir no `gwan-ia`.
- [x] 1.3 Conferir se o loop de tool_calls do chat chama alguma tool de `/users` ou `/admin` (tools geradas do OpenAPI em `src/mcp/converters/openapi-to-mcp.ts`). Verificação: anotar aqui as tools usadas pelo chat; esperado nenhuma de usuário
  - **Nenhuma tool de usuário.** O conversor só publica operações com `x-mcp.enabled`, e só duas têm: `list_products` e `get_product_by_code` (`GET /api/mcp/tools` confirma). `/users` e `/admin` não viram tool.

## 2. Guard de papel reutilizável

- [x] 2.1 Criar o decorator `@Roles(...roles: UserRole[])` e o `RolesGuard` em `src/auth/guards/` (D1). Sem metadata de papel, o guard deixa passar; com metadata, exige `req.user.role` na lista. Verificação: `roles.guard.spec.ts` cobre sem usuário (false), papel fora da lista (false), papel na lista (true), rota sem `@Roles` (true)
  - `src/auth/guards/roles.decorator.ts` + `roles.guard.ts`; lê o metadata do handler e do controller (`getAllAndOverride`). 5 testes.
- [x] 2.2 Registrar o `RolesGuard` como provider do `AuthModule` e exportá-lo. Verificação: `npm run build` sem erro

## 3. Cadastro e edição sem papel

- [x] 3.1 Remover `role` de `RegisterDto` e fixar `UserRole.USER` no `RegisterUserUseCase`, sem ler o DTO (D3). Verificação: `register-user.use-case.spec.ts` confirma papel `USER` mesmo se o objeto recebido trouxer `role`; `POST /auth/register` com `role` responde 400
- [x] 3.2 Remover `role` de `UpdateUserDto` e trocar o `Object.assign` do `update` por cópia explícita de `name`/`email`/`phone` (D4). Verificação: `PUT /users/:id` com `role` responde 400, inclusive com token ADMIN
  - Também: `ParseUUIDPipe` nos `:id` de `/users` — id que não é UUID respondia 500 (erro de sintaxe do PostgreSQL), agora 400.
- [x] 3.3 Atualizar exemplos do Swagger que mostram `role` no cadastro e na edição (`atualizarRole`, `atualizacaoCompleta`) e os `.http` de `src/auth` e `src/users`. Verificação: `grep -n "role" src/auth/dto/register.dto.ts src/shared/presentation/dtos/update-user.dto.ts` vazio; Swagger em `/api` sem `role` nesses corpos

## 4. Rotas com dono

- [x] 4.1 `GET /users` e `DELETE /users/:id`: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`. Verificação: usuário comum recebe 403; ADMIN recebe 200
  - `PUT /users/:id/promote` também ganhou `@Roles(ADMIN)` (o use case já conferia). A resposta da promoção devolvia a **entidade inteira, com o hash bcrypt da senha** — passou a sair pelo `UserResponseDto`.
- [x] 4.2 `GET /users/:id` e `PUT /users/:id`: aceitar o próprio usuário ou ADMIN via `assertSelfOrAdmin(req.user, id)` (D2). Verificação: `assert-self-or-admin.spec.ts` (próprio → ok, outro → Forbidden, ADMIN → ok); usuário comum lendo outro id recebe 403
  - A checagem roda **antes** da busca: usuário comum recebe 403 para qualquer id alheio, exista ou não, e não sonda ids pela diferença 403/404.
- [x] 4.3 `AdminController`: `RolesGuard` + `@Roles(UserRole.ADMIN)` no controller. Verificação: `/admin/dashboard` e `/admin/users/:id/analytics` dão 403 para usuário comum e 200 para ADMIN
- [x] 4.4 Trocar `throw new Error('User not found')` por `NotFoundException` nos handlers de `/users` (D5). Verificação: ADMIN pedindo um UUID inexistente recebe 404, não 500
- [x] 4.5 Atualizar as respostas `@ApiResponse` 403 das rotas acima para refletir a regra real. Verificação: leitura do Swagger

## 5. Prova de ponta a ponta

- [x] 5.1 `scripts/smoke-roles.mjs` (Node, sem dependências, `MART_API` default `http://localhost:3011/api`, credenciais de ADMIN por env) cobrindo todos os cenários de `specs/user-role-access/spec.md`, incluindo "papel alterado depois do login" (promover e repetir a chamada com o mesmo token) e limpando os usuários que criar. Verificação: `node scripts/smoke-roles.mjs` termina com exit 0 e uma linha por cenário
  - Credenciais por `MART_ADMIN_EMAIL`/`MART_ADMIN_PASSWORD`. 49 verificações, exit 0 contra a API em `:3111` (2026-11-16).
  - ⚠️ **`npm run admin:create` cria USER, não ADMIN** (em `origin/main`): passa `UserRole.ADMIN` na posição do `whatsappNumber`, então o usuário nasce `USER` com WhatsApp `"ADMIN"` e o log diz "Role: ADMIN". Com o buraco fechado, é o único caminho para o primeiro admin. Esta change **não** mexe no script (há correção não commitada na checkout principal); para rodar o smoke, o papel do usuário de teste foi acertado direto no banco de dev.
- [x] 5.2 Regressão: login, `GET /auth/profile`, escrita de catálogo por ADMIN e vitrine anônima (`GET /products`, `/featured`, `/:code`, `POST /chat`) seguem funcionando. Verificação: incluir no smoke ou rodar à mão e anotar
  - Coberto no smoke: login e `/auth/profile`; ADMIN passa pelo guard de escrita do catálogo (`PUT`/`DELETE /products/<id inexistente>` → 404 do handler, sem deixar resíduo) e usuário comum para nele (403); vitrine anônima `GET /products`, `/featured`, `/:code` → 200; `POST /chat` segue público (nem 401 nem 403). No dev local o chat responde 500 por falta de `OPENAI_API_KEY` — ambiente, igual antes da change.
  - Achado fora de escopo: `POST /auth/login` com credencial inválida responde **500** (o `LoginUserUseCase` lança `Error` comum), não 401.
- [x] 5.3 `npm run lint`, `npm run build` e `npm test` passam. Verificação: saída dos três comandos
  - lint limpo, build ok, `npm test` 5 suítes / 20 testes (eram 2 / 7).

## Workflow follow-up

- Fechar a issue do board (Project 11, "Gwan Mart") vinculada a esta change.
- Arquivar com `openspec archive lock-role-assignment` depois do merge.
- A issue #6 (papéis/`CORRETOR`) passa a poder migrar o `CorretorOrAdminGuard` para `@Roles`.
