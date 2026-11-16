# Design — lock-role-assignment

## Context

Motivação em `proposal.md`; comportamento exigido em `specs/user-role-access/spec.md`.
Fatos do código que moldam a solução:

- O `ValidationPipe` global (`src/main.ts`) roda com `whitelist` **e** `forbidNonWhitelisted`:
  campo que não existe no DTO já vira 400. Tirar `role` dos DTOs basta para recusar o campo.
- A `JwtStrategy` relê o usuário do banco em `validate()` e põe a **entidade** em `req.user`. O
  papel em `req.user.role` já é o atual, não o do token — o requisito "papel avaliado pelo
  estado atual" já vale e só precisa ser preservado (e testado).
- O único guard de papel hoje é o `CorretorOrAdminGuard`, específico do catálogo.
- `UsersController.update` faz `Object.assign(user, userData)` e os handlers usam
  `throw new Error('User not found')`, que vira 500.

## Goals / Non-Goals

**Goals:**
- Um mecanismo de papel reutilizável pela área de admin da loja (#13).
- Nenhum caminho que conceda papel além de `PUT /users/:id/promote`.

**Non-Goals:**
- Trocar o `CorretorOrAdminGuard` do catálogo pelo mecanismo novo — fica para a issue #6, junto
  com o destino do `CORRETOR`, para não mexer duas vezes nas mesmas rotas.
- Rebaixar papel, último-ADMIN, auditoria de mudança de papel.

## Decisions

### D1 — `@Roles(...)` + `RolesGuard` em vez de mais um guard por combinação
Decorator com `SetMetadata('roles', [...])` e um `RolesGuard` que lê o metadata pelo
`Reflector` e compara com `req.user.role`. Aplicado junto com `JwtAuthGuard`
(`@UseGuards(JwtAuthGuard, RolesGuard)`), que garante 401 antes do 403.
*Alternativa*: `AdminGuard` dedicado, como o `CorretorOrAdminGuard`. Rejeitada: cada nova
combinação de papéis viraria uma classe, e a #6 vai mexer exatamente nas combinações.

### D2 — "Próprio usuário ou ADMIN" é regra do handler, não do guard
`GET /users/:id` e `PUT /users/:id` comparam `req.user.id` com `:id` e aceitam ADMIN, senão
`ForbiddenException`. Um guard genérico precisaria saber qual parâmetro é o dono do recurso; com
duas rotas, uma função pequena (`assertSelfOrAdmin(req.user, id)`) é mais legível.

### D3 — Recusar `role` com 400 em vez de ignorar
Tirar o campo de `RegisterDto` e `UpdateUserDto` e deixar o `forbidNonWhitelisted` responder.
*Alternativa*: aceitar e descartar em silêncio. Rejeitada: o cliente que manda `role` acha que
funcionou, e um front que dependa disso falha sem sinal. 400 aparece no primeiro teste.
O use case de cadastro passa a fixar `UserRole.USER`, sem ler nada do DTO — defesa caso o campo
volte ao DTO por engano.

### D4 — `update` grava só os campos permitidos
Trocar o `Object.assign(user, userData)` por cópia explícita de `name`, `email` e `phone`. O
whitelist do pipe já barra campos extras hoje, mas o `Object.assign` transformaria qualquer campo
futuro do DTO em campo gravável sem que ninguém decida isso.

### D5 — 404 com `NotFoundException`
Handlers de `/users` trocam `throw new Error(...)` por `NotFoundException`. Fica dentro desta
change porque os cenários de 403/404 precisam ser distinguíveis no teste.

### D6 — Testes no padrão já existente
Unitários em `*.spec.ts` dentro de `src/` (Jest, `rootDir: src`): `RolesGuard`,
`assertSelfOrAdmin` e o `RegisterUserUseCase`. Mais um smoke contra a API real
(`scripts/smoke-roles.mjs`) que repete a sonda que achou o problema — é o teste que prova que o
buraco fechou, porque depende do pipe, dos guards e do banco juntos.

## Risks / Trade-offs

- [Front do `gwan-ia` manda `role: 'USER'` no cadastro e passa a receber 400] → conferir o
  formulário de cadastro da área `/gwan-mart` antes de fechar a change (task 1.2); se mandar,
  corrigir lá primeiro.
- [Admin de dev perde acesso a `/users` se tiver sido criado pelo buraco com outro papel] → não
  se aplica: quem foi criado como ADMIN segue ADMIN. Admin legítimo vem de `npm run admin:create`.
- [Tools MCP de `/users` e `/admin` começam a responder 403 para o bot] → o bot do chat só lê
  catálogo; confirmar que nenhuma tool de usuário é chamada pelo loop do chat (task 1.3).

## Migration Plan

Sem migration nem dado a converter: não há produção. Deploy é o normal da stack (Portainer),
quando ela existir. Rollback é reverter o commit.
