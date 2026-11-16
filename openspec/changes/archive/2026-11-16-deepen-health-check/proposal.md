# Proposal — deepen-health-check

## Why

`GET /api/health` responde `status: ok` sem consultar nada. O controller monta um objeto com
`uptime`, `timestamp` e `NODE_ENV` — não toca no PostgreSQL, não toca no MinIO, não toca no
Redis. É verde enquanto o processo estiver de pé.

Isso importa porque o health é justamente o que decide o destino do container: o
`docker-compose.production.yml` e o `Dockerfile` usam essa rota no `healthcheck`, e é ela que
o script `health-check-production.sh` do gwan-infra consulta. Com o banco fora do ar, o
container continua `healthy`, o Traefik continua roteando e todo request de catálogo responde
500 — o painel diz que está tudo bem enquanto o app está inutilizável.

O caso não é hipotético neste app: o `MinioStorageService` faz `throw` no `onModuleInit` se
não conseguir verificar o bucket, ou seja, a dependência de MinIO é dura no boot mas invisível
depois dele. E o Redis é usado como cache sem que sua ausência apareça em lugar nenhum.

## What Changes

- **Health passa a verificar as dependências que a aplicação realmente exige**: PostgreSQL
  (consulta trivial, com timeout curto), MinIO (bucket acessível) e Redis (ping), cada um
  reportado individualmente.
- **Distinção entre indisponível e degradado**: sem banco, o serviço não entrega catálogo nem
  chat — é `unhealthy`. Sem Redis, ele funciona mais devagar — é `degraded`, e o container não
  deve ser reiniciado por causa disso. O precedente do ecossistema é o gwan-watt, que responde
  `degraded` com MinIO fora e segue servindo o resto.
- **Timeout e custo controlados**: o healthcheck roda a cada 30s no container; a verificação
  precisa de timeout curto e não pode virar carga no banco.
- **Separação entre liveness e readiness**, se necessário: uma rota que diz "o processo está
  vivo" e outra que diz "dá para atender request" — hoje as duas perguntas têm a mesma
  resposta.

**Fora de escopo:** métricas/OTEL e alerting (backlog de observabilidade do gwan-infra).

## Capabilities

### Added Capabilities
- `service-health`: o health passa a refletir a capacidade real de atender, e não apenas a
  existência do processo.

## Impact

- **`src/health/`**: controller e serviço de verificação (o `@nestjs/terminus` já é padrão em
  Nest para isso e evita código próprio).
- **`docker-compose.production.yml` / `Dockerfile`**: o healthcheck passa a distinguir
  `degraded` de `unhealthy` — cuidado para o container não entrar em restart loop por causa de
  dependência opcional.
- **Risco**: um health mais rigoroso pode marcar como não-saudável um serviço que antes
  "funcionava" — isso é o objetivo, mas exige que a stack já esteja correta (ver
  `align-production-stack-gwan`).
