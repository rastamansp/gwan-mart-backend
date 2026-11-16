# Tasks — deepen-health-check

## 1. Classificar as dependências

- [x] 1.1 PostgreSQL: obrigatório (sem ele não há catálogo nem chat) → `unhealthy`
- [x] 1.2 MinIO: obrigatorio no boot, mas em runtime so afeta upload — classificado como degradado (validado: catalogo respondeu 200 com MinIO parado)
- [x] 1.3 Redis: cache → `degraded`, nunca `unhealthy`

## 2. Implementação

- [x] 2.1 `@nestjs/terminus@10` conflita com os peers desta arvore (ERESOLVE) — implementado `HealthService` proprio, sem dependencia nova
- [x] 2.2 Indicador de PostgreSQL com consulta trivial e timeout curto (o healthcheck roda a cada 30s)
- [x] 2.3 Indicador de MinIO (bucket acessível) e de Redis (ping)
- [x] 2.4 Resposta com estado por dependência, mantendo os campos atuais (`uptime`, `timestamp`, `environment`, `version`) para não quebrar consumidores

## 3. Integração com a stack

- [x] 3.1 Definir qual estado o `healthcheck` do container considera falha — `degraded` não pode causar restart loop
- [x] 3.2 Formato antigo preservado (status/timestamp/uptime/environment/version) + campo `dependencies`; 200 em ok/degraded mantem o script da infra funcionando

## 4. Validação

- [x] 4.1 Derrubar o Postgres de dev → `/api/health` reporta não-saudável e nomeia a dependência
- [x] 4.2 Derrubar o MinIO de dev → estado conforme decidido em 1.2
- [x] 4.3 Derrubar o Redis → `degraded` — validado em 2026-11-16 (issue #5) contra um Redis proprio (`redis:7-alpine`, porta 6491), com a API na 3511: de pe `ok`; parado `degraded` com `cache.error: "The client is offline"`, HTTP 200 em ~4 ms e `GET /api/products` 200; de volta `ok` ~1,3 s depois, sem reiniciar a API. Tambem: boot com o Redis parado sobe `degraded` e vira `ok` quando ele aparece. ⚠️ A primeira tentativa mostrou que a inspecao de codigo tinha errado: o health dava `ok` com o Redis parado, porque o cache nunca usou o Redis — o `@nestjs/cache-manager` v3 ignora a opcao `store` e o `cache-manager-redis-store` virava cache em memoria. Corrigido com `@keyv/redis` em `stores` (`src/config/redis.config.ts`, teste em `redis.config.spec.ts`)
- [x] 4.4 Tudo no ar → `ok`, e a rota responde em tempo compatível com o intervalo do healthcheck
