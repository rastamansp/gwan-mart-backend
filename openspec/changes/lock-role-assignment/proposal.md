# Proposal — lock-role-assignment

## Why

A `secure-catalog-write-endpoints` fechou a escrita do catálogo atrás de papel administrativo,
mas **qualquer pessoa consegue se dar esse papel**. Verificado contra a API local em 2026-11-16:

| Ação | Quem consegue | Resultado |
|---|---|---|
| `POST /api/auth/register` com `"role":"ADMIN"` no corpo | anônimo | usuário criado **como ADMIN** |
| `PUT /api/users/<próprio id>` com `{"role":"ADMIN"}` | qualquer usuário logado | **vira ADMIN** |
| `GET /api/users` | qualquer usuário logado | lista todos os usuários (e-mail, telefone, papel) |
| `DELETE /api/users/:id` | qualquer usuário logado | apaga qualquer usuário |
| `GET /api/admin/dashboard`, `/admin/users/:id/analytics` | qualquer usuário logado | 200 |

Hoje o guard do catálogo só barra quem não leu o Swagger. O Mart ainda não está publicado, mas
`/auth/register` é rota pública: isso precisa estar fechado **antes** do primeiro deploy, e é
pré-requisito do admin de produtos na loja (issue #13), que confia no papel do usuário logado.

## What Changes

- **BREAKING** — **Cadastro não aceita papel**: `role` sai do `RegisterDto`; todo cadastro nasce
  `USER`. Corpo com `role` passa a ser recusado com 400 (o `ValidationPipe` global já usa
  `forbidNonWhitelisted`), em vez de ser silenciosamente aceito.
- **Papel só muda por um caminho**: `role` sai do `UpdateUserDto`. Trocar papel é exclusivo de
  `PUT /users/:id/promote`, que já confere se quem promove é ADMIN.
- **`/users` passa a ter dono**: listar e apagar exigem ADMIN; ler e editar o próprio cadastro
  continua permitido ao próprio usuário (e ao ADMIN).
- **`/admin/*` exige ADMIN**, não apenas login.
- **Guard de papel reutilizável** (`@Roles(...)` + `RolesGuard`), para que a área de admin da
  loja (#13) e as rotas acima usem a mesma regra.
- **Erros previsíveis**: "usuário não encontrado" responde 404 (hoje `throw new Error` vira 500).

**Fora de escopo:**
- Renomear ou aposentar o papel `CORRETOR` — é a issue #6 / change `remove-imoveis-fork-residue`.
  Esta change **não muda** o `CorretorOrAdminGuard` do catálogo.
- Rebaixar papel (o `promote` só promove) e proteção contra apagar o último ADMIN.
- Tela de admin na loja (#13).

## Capabilities

### New Capabilities
- `user-role-access`: quem pode criar, ver, alterar e apagar usuários, e por qual caminho um
  papel muda — regra explícita e verificável rota a rota.

### Modified Capabilities
<!-- nenhuma: openspec/specs/ ainda não tem capability arquivada -->

## Impact

- **`src/auth/dto/register.dto.ts`** e **`src/shared/application/use-cases/register-user.use-case.ts`**:
  sem `role`; papel fixo `USER`.
- **`src/shared/presentation/dtos/update-user.dto.ts`**: sem `role`.
- **`src/users/users.controller.ts`**: guards por rota, regra "próprio usuário ou ADMIN", 404.
- **`src/admin/admin.controller.ts`**: exige ADMIN.
- **`src/auth/guards/`** + decorator novo: `RolesGuard` / `@Roles`.
- **Clientes**: qualquer front que mande `role` no cadastro passa a receber 400 — conferir o
  formulário de cadastro do `gwan-ia` (área `/gwan-mart`) antes de fechar. A loja em `web/` não
  tem cadastro nem login.
- **Tools MCP**: são geradas do OpenAPI; as rotas de `/users` e `/admin` continuam existindo,
  só passam a exigir o papel.
- **Dados**: sem migration. Usuários ADMIN criados pelo buraco só existem em bancos de dev
  (não há produção).
