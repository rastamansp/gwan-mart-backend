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
- [ ] 4.3 Derrubar o Redis → `degraded` — NAO validado: o Redis usado em dev roda no host (fora do docker-compose do mart), entao nao foi derrubado. O caminho e o mesmo do MinIO (nao-critico), validado por inspecao de codigo apenas
- [x] 4.4 Tudo no ar → `ok`, e a rota responde em tempo compatível com o intervalo do healthcheck
