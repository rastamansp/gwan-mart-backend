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
- [x] 4.4 Serviço PostgreSQL no job, se houver teste que toque banco (precedente: CI do gwan-watt)

## 5. Validação

- [x] 5.1 `docker compose -f docker-compose.production.yml config` sem erro e com rede/labels esperadas
- [ ] 5.2 Build da imagem — **não validado**: `docker build` da imagem de produção não foi executado nesta rodada
- [ ] 5.3 CI verde num PR de teste — **não validado**: exige push para o GitHub. Localmente `npm run lint`, `npm run build` e `npm test` (7 testes) passam, e as migrations rodaram duas vezes em banco limpo
