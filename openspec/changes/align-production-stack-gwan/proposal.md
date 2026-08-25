# Proposal — align-production-stack-gwan

## Why

Os artefatos de publicação deste repo não descrevem o Mart. Descrevem outros dois apps, por
herança de fork, e nenhum deles foi revisado:

- **`portainer-stack.yml` é do `gwan-events-backend`** — o serviço se chama
  `gwan-events-backend`, a imagem é `gwan-events-backend:latest`, o CORS aponta para
  `events.gwan.com.br` e o MCP para `api-events.gwan.com.br`. Colar esse arquivo no Portainer
  publicaria uma stack de eventos com o nome errado.
- **`docker-compose.production.yml`** ao menos fala de mart, mas fora do padrão GWAN: domínio
  `api-mart.gwan.com.br` (o ecossistema é `*.gwan.cloud`; `.com.br` é legado), rede `gwan` (a
  rede real é `gwan-network`), porta `3001` (o slot 11 é `3011`) e um middleware
  `redirect-to-https` declarado inline, que no ambiente real já existe no Traefik.
- **`docker-entrypoint.sh` é do events** ("Starting Gwan Events Backend") e espera
  `DB_HOST`/`DB_PORT`, variáveis que esta aplicação não usa — ela lê `DATABASE_URL`. Como
  `DB_HOST` nunca é definido, o wait-for-postgres cai direto no `skip`. E o script sequer é
  invocado: o `Dockerfile` não tem `ENTRYPOINT`, o `CMD` chama `node dist/src/main.js`
  diretamente. **O passo de migrations que o arquivo promete nunca roda.**
- **`.github/workflows/deploy.yml` não publica nada.** Dispara em todo push na `main`, e o
  `deploy:prod` que ele executa é build + docs + um `echo` de sucesso. Pior que inútil: dá
  sinal verde de deploy que não aconteceu. Não roda teste em momento algum, e o `test:bdd`
  está quebrado (aponta para `src/properties/`, que não existe).

O `gwan-infra` decidiu em 2026-07-29 remover os workflows de deploy do monorepo justamente por
isso: deploy é do Portainer, CI é para **testar**. Este repo ficou com o inverso.

## What Changes

- **`portainer-stack.yml` reescrito para o Mart** ou removido. Um arquivo que publica outro
  app é armadilha; se a stack vai ser colada na UI do Portainer, o arquivo tem que ser o do
  Mart, com nome de serviço, imagem e domínios corretos.
- **`docker-compose.production.yml` no padrão GWAN**: rede `gwan-network` externa, porta do
  slot 11, host `*.gwan.cloud`, labels Traefik sem redeclarar middleware global, `restart:
  unless-stopped`, limites de recurso e logging json-file com rotação, conforme
  `docs/padroes-tecnicos-gwan.md`.
- **Domínio definido antes do deploy**: o Mart não tem DNS hoje. A stack só faz sentido depois
  de escolher o host (`mart-api.gwan.cloud`, no padrão do ecossistema) e criar o registro A.
- **Migrations com dono explícito**: ou o `Dockerfile` passa a usar o entrypoint (corrigido
  para `DATABASE_URL`), ou o passo vira operação ad-hoc documentada
  (`docker exec ... npm run typeorm:migration:run`). Hoje é um script morto que finge cobrir
  isso. Depende de `add-products-schema-migration`.
- **CI vira portão de qualidade**: build + lint + teste em PR e push, sem passo de "deploy"
  mentiroso. O `test:bdd` quebrado é corrigido ou retirado do fluxo.

**Fora de escopo:** publicar de fato a stack (é ação de operação no Portainer, decisão do
mantenedor) e o site de documentação em GitHub Pages.

## Capabilities

### Added Capabilities
- `production-deployment`: os artefatos de publicação passam a descrever este app e o padrão
  real da infraestrutura, e o CI passa a verificar em vez de anunciar.

## Impact

- **`portainer-stack.yml`, `docker-compose.production.yml`, `Dockerfile`,
  `docker-entrypoint.sh`**: reescrita ou remoção.
- **`.github/workflows/deploy.yml`**: substituído por workflow de teste (renomear para
  `ci.yml`; manter o nome `deploy` mantém a mentira).
- **`package.json`**: alvo `deploy:prod` (só `echo`) removido; `test:bdd` corrigido.
- **`gwan-infra`**: ao publicar, registrar domínio e `compose:` em `config/gwan-projetos.yml`
  (slot 11 hoje tem `dominio: null`, `compose: null`) — o painel do infra-admin lê dali.
- **Dependência**: sem `add-products-schema-migration`, uma stack correta ainda sobe com banco
  sem tabelas.
