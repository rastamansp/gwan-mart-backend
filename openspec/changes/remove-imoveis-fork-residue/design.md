# Design — remove-imoveis-fork-residue

Este design cobre, por enquanto, só o grupo **4. Papéis** (issue #6) e a task 1.2. O resto da
change é troca de texto e não pediu decisão.

## Context

Fatos do código que moldam a decisão (verificados em 2026-11-16, sobre `integ/onda-1`, que já
contém a `lock-role-assignment`):

- `UserRole` tinha `USER`, `ADMIN` e `CORRETOR`. No PostgreSQL ele é o tipo
  `users_role_enum` (criado pela baseline `InitialSchema1787696831134`), coluna `users.role`
  com default `'USER'`.
- O único efeito de `CORRETOR` no Mart era a escrita no catálogo: o `CorretorOrAdminGuard`
  aceitava `CORRETOR` ou `ADMIN` em `POST /products`, `POST /products/import`,
  `PUT /products/:id`, `DELETE /products/:id` e `POST /products/catalog/update/:id`. Todo o
  resto que exige papel (`/users`, `/admin`) já era só `ADMIN`.
- Ninguém mais recebia `CORRETOR` por caminho público: a `lock-role-assignment` tirou o papel do
  cadastro e da edição. Sobravam o seed de dev (`vendedor@gwan.cloud`), o default da promoção
  (`PUT /users/:id/promote` sem corpo promovia a `CORRETOR`) e contas antigas.
- A `JwtStrategy` relê o usuário do banco em toda requisição. O `role` que vai no payload do token
  nunca é consultado.
- O Mart **está em produção** (stack `gwan-mart-backend`, banco `gwan_mart`), e a imagem aplica
  as migrations no start (`docker-entrypoint.sh`). Não foi possível contar quantas contas têm
  `CORRETOR` lá; a migration abaixo foi desenhada para ser correta com zero, uma ou várias.

## Goals / Non-Goals

**Goals:**
- Papéis do Mart com o vocabulário do Mart, no código e no banco.
- Escrita de catálogo pelo mecanismo `@Roles` + `RolesGuard` da #14, sem afrouxar rota.
- Conta e token existentes continuam autenticando depois do deploy.

**Non-Goals:**
- Textos e Swagger de imóveis fora do código de papel (fica para a #7).
- O agente de chat `corretor-imoveis` (é slug de agente persistido em `agents`, não papel).
- Rebaixar papel pela API, auditoria geral de mudança de papel.

## Decisions

### D1 — Dois papéis: `USER` e `ADMIN`. O administrador de catálogo é o próprio `ADMIN`
A #13 traz o admin de produtos para a loja com **um** lojista, que já é `ADMIN` (criado por
`npm run admin:create`). Um papel separado de catálogo só paga o custo quando houver alguém que
deva editar produto **sem** gerenciar usuários — e aí basta acrescentar o valor ao enum e a
`@Roles(...)` das rotas de catálogo, sem mexer em guard.
*Alternativa*: renomear `CORRETOR` para um `CATALOG_ADMIN` (`ALTER TYPE ... RENAME VALUE`).
Preservaria exatamente a permissão de quem já tem o papel e seria a migration mais simples, mas
deixaria um terceiro papel sem usuário previsto, que toda regra nova teria de considerar.
Rejeitada pela regra da opção mais simples que atenda a #13.

### D2 — Conta com `CORRETOR` vira `USER`, não `ADMIN`
Mapear para `ADMIN` concederia, além do catálogo, listar/apagar/promover usuários e o dashboard
administrativo — escalada que ninguém decidiu e que não se desfaz sem saber que aconteceu.
Mapear para `USER` tira a escrita no catálogo, mas é recuperável com uma chamada
(`PUT /users/:id/promote`, que agora promove a `ADMIN` por padrão) e é a decisão de menor
privilégio. Para não ser uma perda **silenciosa** (requisito "Papéis descrevem o negócio do
Mart"):
- cada conta rebaixada fica registrada em `user_role_transitions` (`userId`, `previousRole`,
  `newRole`, `migratedAt`; FK com `ON DELETE CASCADE`);
- a migration escreve no log do start quantas contas foram rebaixadas, os ids e como devolver o
  acesso.
A tabela só é criada quando há conta a rebaixar: banco que nunca teve `CORRETOR` não carrega
artefato de uma transição que não viveu. Qualquer outro rótulo fora de `USER`/`ADMIN` (o
`ORGANIZER` que a `MigrateOrganizerToCorretor` não conseguia remover do enum, num banco herdado do
imóveis) recebe o mesmo tratamento.

### D3 — Migrar os dados agora, em vez de aceitar os dois papéis por um período
Aceitar os dois exigiria manter `CORRETOR` no enum TypeScript, no tipo do banco e na lista de
`@Roles` do catálogo — ou seja, manter exatamente o que a issue quer aposentar, com uma segunda
migration depois para terminar o serviço. A migração de dados é pequena, roda no start da imagem
e é reversível (D5).
**Tokens não precisam de período de convivência**: o papel efetivo é o da linha no banco (a
`JwtStrategy` relê o usuário), então um token emitido antes do deploy, com `role: CORRETOR` no
payload, continua válido e passa a valer como o papel atual da conta. Verificado com token forjado
com o segredo de dev (ver tasks 4.2 e 5.2).

### D4 — O enum do banco é recriado sem `CORRETOR`
O PostgreSQL não remove valor de enum. A migration `RetireCorretorRole1794869309825` faz o que o
`migration:generate` do TypeORM faria: renomeia `users_role_enum` para `_old`, cria o novo com
`USER` e `ADMIN`, converte a coluna (`USING role::text::users_role_enum`), devolve o default
`'USER'` e apaga o antigo. Sem isso, o tipo do banco divergiria da entidade e o próximo
`migration:generate` traria a recriação de carona, misturada com a mudança de outra pessoa.
Verificado: depois da migration, `migration:generate --check` não encontra diferença.

### D5 — `down` devolve o papel a quem a migration rebaixou, salvo se já foi promovido
`down` recria o enum com `CORRETOR`, devolve `CORRETOR` a quem está em `user_role_transitions`
com `previousRole = 'CORRETOR'` **e ainda é `USER`**, e apaga a tabela. Quem foi promovido a
`ADMIN` depois do deploy não é rebaixado pelo rollback — o rollback desfaz a migration, não as
decisões tomadas desde então.

### D6 — Escrita de catálogo por `@Roles(UserRole.ADMIN)`, travada por teste de varredura
As cinco rotas trocam `@UseGuards(JwtAuthGuard, CorretorOrAdminGuard)` por
`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` (401 antes de 403, como na #14),
e ganham o 403 no Swagger. O `CorretorOrAdminGuard` é apagado. `products-write-roles.spec.ts`
varre **todos** os handlers `POST`/`PUT`/`PATCH`/`DELETE` do `ProductsController` e exige os dois
guards e o papel `ADMIN`; a única exceção é `POST /products/search/similar` (leitura com corpo,
pública por decisão da `secure-catalog-write-endpoints`). Rota de escrita nova que esqueça o papel
— o upload de foto da #13, por exemplo — quebra o teste.

### D7 — O que é seguro trocar agora × o que depende de migração (task 1.2)

| Item | Seguro sem migração? | Tratamento |
|---|---|---|
| Guard das rotas de catálogo (`CorretorOrAdminGuard` → `@Roles(ADMIN)`) | **Não**, isoladamente: tira a escrita de conta `CORRETOR` existente | Vai junto com a migration (D2) |
| Valor `CORRETOR` em `UserRole` (TS) | **Não**: sozinho, deixa a entidade divergente do tipo do banco e as linhas `CORRETOR` com um papel que nenhum código reconhece | Vai junto com a migration (D4) |
| Tipo `users_role_enum` no banco | Depende da migração dos dados | Migration (D4) |
| Default da promoção (`CORRETOR` → `ADMIN`), exemplos do Swagger, `users.http` | Sim | Feito |
| Seed de dev do usuário `vendedor@gwan.cloud` com `CORRETOR` | Sim | Removido |
| Contador `corretores` em `GET /admin/dashboard` | Sim (nenhum cliente lê; `web/` não usa) | Removido |
| `User.isCorretor()`, `PromoteUserToCorretorUseCase` | Sim (só código) | Removido / renomeado para `PromoteUserUseCase` |
| Token com `role: CORRETOR` no payload | Sim: o payload não é lido (D3) | Nada a fazer |
| Agente de chat `corretor-imoveis` (`agents.slug`) | **Não**: é dado persistido, referenciado por conversas | Fora de escopo (#7) |
| Migrations históricas que citam `CORRETOR`/`corretorId` | Não se reescreve histórico | Mantidas |

## Risks / Trade-offs

- [Em produção há uma conta `CORRETOR` que de fato mantém o catálogo] → ela perde a escrita no
  deploy. Mitigação: o log do start lista os ids, e um `ADMIN` devolve o acesso com
  `PUT /users/:id/promote`. **Conferir antes do deploy**:
  `SELECT role, count(*) FROM users GROUP BY role` no banco `gwan_mart`.
- [Não há `ADMIN` em produção] → ninguém consegue promover pela API. O caminho é
  `npm run admin:create` dentro do container — que em `origin/main` cria `USER` por um bug de
  posição de argumento (anotado na task 5.1 da `lock-role-assignment`); a correção precisa
  chegar antes de depender dele.
- [A #13 foi desenhada contra `CorretorOrAdminGuard` e `CATALOG_ROLES = ['ADMIN', 'CORRETOR']`
  no front] → ao integrar, o upload de foto usa `@Roles(UserRole.ADMIN)` (o teste de varredura
  cobra) e o front confere só `ADMIN`.
- [Recriar o enum toma lock em `users`] → a tabela é pequena e a migration roda no start, antes
  de a API aceitar tráfego.

## Migration Plan

1. Deploy normal pela Portainer: a imagem roda `migration:run` no start, que aplica
   `RetireCorretorRole1794869309825`.
2. Ler o log do start: a linha `[RetireCorretorRole]` só aparece se alguém foi rebaixado.
3. Rollback de código: a imagem anterior funciona sobre o banco migrado sem passo extra (o enum
   dela é um superconjunto do novo), só que as contas rebaixadas continuam `USER`. Para devolver
   também o papel antigo, reverter a migration **com a imagem nova ainda no ar** (é ela que contém
   o `down`): `node ./node_modules/typeorm/cli.js migration:revert -d dist/config/data-source.js`
   via `docker exec`, e só então voltar a imagem.
