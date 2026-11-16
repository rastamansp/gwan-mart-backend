# Tasks — remove-imoveis-fork-residue

## 1. Inventário

- [x] 1.1 Listar as ocorrências de imóvel/propriedade/corretor em `src/` e classificar cada uma: texto, contrato de API, ou dado persistido
- [x] 1.2 Separar o que é seguro trocar agora do que depende de migração de dados (papéis)
  - Tabela em `design.md` D7. Guard do catálogo, valor `CORRETOR` no TS e o tipo do banco só vão juntos, com a migration; default da promoção, seed, contador do dashboard, Swagger e `.http` eram seguros. O agente `corretor-imoveis` é dado persistido e ficou fora (#7).

## 2. Suíte BDD

- [x] 2.1 `test:bdd` repontado para `src/chat/steps` + `src/chat/features` (os de `src/properties/` não existem)
- [x] 2.2 Se mantida, garantir que a suíte roda de verdade e entra no CI (ver `align-production-stack-gwan`) — issue #8
  - **Decisão: a suíte BDD herdada saiu.** Nenhum cenário dela podia rodar no CI nem verificar o Mart:

    | Teste herdado | Decisão | Motivo |
    |---|---|---|
    | `src/chat/features/chat-session.feature` + `src/chat/steps/chat-steps.ts` | removido | Os 3 cenários só checam "recebi resposta" do `POST /api/chat`, que exige API no ar **e** chave de LLM paga; sem ela o chat responde 500. Resposta de LLM não é determinística, e o step file trazia tolerâncias de imóvel ("não há imóveis cadastrados"). O que importa do chat no CI — continuar público, sem 401/403 — já é verificado pelo `scripts/smoke-roles.mjs` |
    | `src/products/tests/bdd/features/products-listing.feature` | removido | 11 cenários e **nenhum step implementado** (`cucumber-js --dry-run`: 84 de 98 steps indefinidos); descreve `/api/v1/products`, rota que a API não expõe (é `/api/products`) |
    | `test/bdd/steps/chat-health-steps.ts`, `test/bdd/support/chat-health-client.ts` | removido | Chatbot de doenças/plantas de outro app do ecossistema; não há rota `chat-health` aqui |
    | `test/bdd/support/properties-client.ts` | removido | Cliente da API de imóveis (`Property`, `realtorId`); nenhuma feature o usava |
    | `test/bdd/steps/common-steps.ts`, `support/{hooks,world,test-client}.ts`, `.cucumberrc.js`, `README.md` | removido | Infra da suíte acima; o `hooks.ts` apontava para `localhost:3009` (porta do imóveis) e o `.cucumberrc.js` para `src/properties/` |
    | `test:e2e` (`jest --config ./test/jest-e2e.json`) | removido | O `jest-e2e.json` não existe, e nunca houve teste e2e no repo |
    | `test:bdd`, `test:bdd:watch`, `test:bdd:report`, `@cucumber/*` | removidos | Sem suíte; script que nunca roda simula cobertura (ver proposal) |

  - **O que ficou e roda no CI**: os 12 `*.spec.ts` (53 testes, todos escritos para o Mart, nenhum herdado do fork) por `npm test`, sem `--passWithNoTests` — o Jest sai com 1 se o `testRegex` não achar nada. E o `scripts/smoke-roles.mjs` (48 verificações), agora rodado no CI contra a API compilada subindo por `npm start`, com PostgreSQL e MinIO reais.
  - Verificação: cada bloco `run:` do `ci.yml` executado verbatim (`bash -eo pipefail`) contra banco limpo e MinIO próprios — todos passam.

## 3. Vocabulário

- [x] 3.1 Exemplo do `ChatRequestDto` fala de produto; **restam** DTOs de auth/usuário e `src/chat/steps/chat-steps.ts` (tolerâncias BDD com "não há imóveis cadastrados")
  - ⚠️ Mudou em 2026-11-16: `chat-steps.ts` saiu junto com a suíte BDD (tarefa 2.2); restam só os DTOs de auth/usuário
- [ ] 3.2 Mensagens e comentários de domínio revisados nos módulos herdados
- [x] 3.3 Seeds usam `gwan.cloud` no lugar de `gwan.com.br`
- [x] 3.4 `.env.example` com a porta do slot 11 (hoje diz 3009, do imóveis) e nomes do Mart

## 4. Papéis

- [x] 4.1 Definir o conjunto de papéis do Mart (mínimo: usuário e administrador de catálogo)
  - `USER` e `ADMIN`; o administrador de catálogo é o próprio `ADMIN` (`design.md` D1). `CORRETOR` saiu do `UserRole`, do seed, do dashboard e da promoção (default agora `ADMIN`; `targetRole: CORRETOR` responde 400). `PromoteUserToCorretorUseCase` virou `PromoteUserUseCase`.
- [x] 4.2 Plano de transição para tokens/registros com o papel antigo (aceitar ambos por um período ou migrar dados)
  - Migrar dados (D2–D5): `RetireCorretorRole1794869309825` passa `CORRETOR` (e qualquer rótulo fora de USER/ADMIN) a `USER`, registra cada conta em `user_role_transitions`, loga ids e como devolver o acesso, e recria `users_role_enum` só com USER/ADMIN. Tokens não precisam de período: a `JwtStrategy` relê o papel do banco.
  - Testada em 2026-11-16 em bancos próprios (`gwan_mart_wt6_*`, apagados depois). **Limpo**: migrations do zero → enum `{USER,ADMIN}`, default `USER`, sem `user_role_transitions`; `migration:generate --check` sem diferença; `down` → `{USER,ADMIN,CORRETOR}`; `up` de novo ok. **Com dados**: migrations de `origin/main` + 2 `CORRETOR`, 1 `USER`, 1 `ADMIN` (um `CORRETOR` com `user_credits`) → os 2 viram `USER`, registrados e logados; `USER`/`ADMIN` intactos. Depois de promover um dos dois a `ADMIN` pela API, `down` devolveu `CORRETOR` só ao que seguia `USER`, manteve o promovido como `ADMIN` e apagou a tabela; `up` de novo rebaixou só o restante.
- [x] 4.3 Alinhar com `secure-catalog-write-endpoints`, que depende de "quem é administrador"
  - As 5 rotas de escrita do catálogo trocaram `CorretorOrAdminGuard` (apagado) por `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`, com 403 no Swagger. `products-write-roles.spec.ts` varre todo handler de escrita do controller e exige os dois guards e `ADMIN` (exceção declarada: `POST search/similar`).

## 5. Validação

- [ ] 5.1 `grep` por imóvel/propriedade/corretor em `src/` retorna apenas o que foi conscientemente mantido
- [x] 5.2 Login e rotas autenticadas seguem funcionando com usuário existente
  - API em `:3611` sobre o banco "com dados" já migrado: ex-`CORRETOR` faz login, lê `/auth/profile` (papel `USER`) e o próprio cadastro; token forjado com o segredo de dev e `role: CORRETOR` no payload (como os emitidos antes do deploy) segue aceito, vale como `USER` e recebe 403 na escrita do catálogo; `ADMIN` existente passa pelo guard em `PUT`/`DELETE`/`catalog/update`; import anônimo 401; promoção sem corpo devolve a escrita a um ex-`CORRETOR`. `scripts/smoke-roles.mjs` (ADMIN do banco de teste): 48/48.
- [ ] 5.3 `/api` (Swagger) descreve o Mart de ponta a ponta

## 6. Feito fora do inventário original

- [x] 6.1 `chat.service.ts`: removidos os ramos `list_properties` e `get_property_by_id` do formatador de tool results — as tools do bot são geradas do OpenAPI desta API (só produtos), então eram código morto
- [x] 6.2 `user-credit-repository.interface.ts`: removido `Symbol` morto que colidia com a interface e quebrava o lint (injeção sempre foi pelo token string)
- [x] 6.3 Credenciais de produção hardcoded removidas de 4 scripts (ver change `secure-catalog-write-endpoints`)
