# Tasks — align-production-stack-gwan

## 1. Decidir o alvo

- [x] 1.1 Host: `mart-api.gwan.cloud` — a decisão já existia: o `apps/ia/docker-compose.yml` do gwan-infra consome esse host. **Falta** criar o registro A e preencher `dominio`/`compose` no `config/gwan-projetos.yml` (slot 11 segue `null`)
- [x] 1.2 Confirmar que o front (`gwan-ia`) recebe a URL por build arg `VITE_GWAN_MART_API_URL` na stack dele

## 2. Compose de produção

- [x] 2.1 Rede `gwan-network` externa (não `gwan`)
- [x] 2.2 Porta do slot 11, com `EXPOSE`/healthcheck do Dockerfile coerentes com ela
- [x] 2.3 Labels Traefik: host `*.gwan.cloud`, `certresolver=letsencrypt`, sem redeclarar `redirect-to-https` (já existe no Traefik da infra)
- [x] 2.4 Logging `json-file` com `max-size`/`max-file` e limites de recurso conforme `docs/padroes-tecnicos-gwan.md`
- [x] 2.5 `CORS_ORIGINS` e `FRONTEND_URL` apontando para `https://gwan.cloud` (onde vive a área `/gwan-mart`)

## 3. Portainer stack e entrypoint

- [x] 3.1 `portainer-stack.yml` esvaziado (só comentário apontando para `docker-compose.production.yml`) — a remoção do arquivo foi bloqueada pelo ambiente e continua preferível
- [x] 3.2 `docker-entrypoint.sh`: corrigir para `DATABASE_URL` (ou remover, se as migrations forem operação ad-hoc)
- [x] 3.3 Se mantido, `Dockerfile` passa a chamá-lo via `ENTRYPOINT` — hoje o `CMD` o ignora

## 4. CI de verdade

- [x] 4.1 `ci.yml` novo (build + lint + migrations em banco limpo + testes, com serviço Postgres); `deploy.yml` esvaziado — sem `on:`, não agenda execução
- [x] 4.2 Remover o alvo `deploy:prod`, que só imprime mensagem de sucesso
- [x] 4.3 `test:bdd` repontado para `src/chat/` (os caminhos `src/properties/` não existem); **não** entra no CI ainda — a suíte precisa de API no ar
  - ⚠️ **Mudou em 2026-11-16 (issue #8, `remove-imoveis-fork-residue` 2.2)**: a suíte BDD saiu do repositório em vez de entrar no CI (motivos na tabela daquela tarefa). O que precisava de API no ar agora roda no CI: o job `api` sobe a API compilada por `npm start` (com MinIO, que o boot exige) e roda `scripts/smoke-roles.mjs` contra ela. O CI ganhou também o job `web` (lint e build da loja), e o lint deixou de usar `--fix`, que fazia o passo corrigir o checkout do runner e passar.
- [x] 4.4 Serviço PostgreSQL no job, se houver teste que toque banco (precedente: CI do gwan-watt)

## 5. Validação

- [x] 5.1 `docker compose -f docker-compose.production.yml config` sem erro e com rede/labels esperadas
- [x] 5.2 Build da imagem — validado em 2026-11-16 (issue #8): `docker build` da imagem de produção passou, e o container, apontado para um banco vazio próprio, esperou o PostgreSQL, aplicou as 3 migrations pelo alvo `:prod` e subiu por `dist/main.js` com `/api/health` 200. O `npm start` apontava para `dist/src/main.js`, que o build nunca gerou, e o entrypoint só chegava a `dist/main.js` pelo fallback — agora os dois usam o caminho real, e o Dockerfile falha o build se ele não existir
- [ ] 5.3 CI verde num PR de teste — **não validado**: exige push para o GitHub. ⚠️ **Atualizado em 2026-11-16 (issue #8)**: cada bloco `run:` dos dois jobs foi executado verbatim com `bash -eo pipefail` (o shell do Actions) contra banco limpo e MinIO próprios — lint, build, migrations ×2, tabelas, 53 testes, `npm start`, ADMIN e smoke de papéis (48/48), lint e build da loja. Não exercitado: os `uses:` (checkout, setup-node e o cache), o service container e a imagem do MinIO baixada pelo runner
