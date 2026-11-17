# Design — add-store-product-admin

## Context

Motivação em `proposal.md`; comportamento exigido em `specs/store-product-admin/spec.md`.
Fatos do código que moldam a solução:

- A escrita de catálogo já existe e já tem guard: `POST/PUT/DELETE /api/products` exigem
  `JwtAuthGuard` + `CorretorOrAdminGuard`. Falta só a tela e o upload.
  ⚠️ *Mudou ao portar para o `main` (2026-11-16)*: a #6 aposentou o CORRETOR, e toda escrita
  passou a `JwtAuthGuard` + `RolesGuard` com `@Roles(ADMIN)` — inclusive o upload desta change.
- `POST /auth/login` e `GET /auth/profile` respondem **sem** o envelope `{status, data}` que as
  rotas de produto usam. O cliente da loja hoje só conhece o envelope.
- `GET /api/products/all` devolve **todos** os produtos não removidos, inclusive inativos (o
  `findAll` do repositório não filtra `isActive`). Não existe `GET /products/:id`; o detalhe
  público é por `code` e filtra ativos.
- `DELETE /api/products/:id` é soft delete.
- O repositório passa `images` direto ao `Repository.update` do TypeORM, que não atualiza relação
  `OneToMany` — daí o 500.
- `MinioStorageService.uploadFile` já existe (grava e devolve a chave); `getFileUrl` monta
  `protocol://MINIO_ENDPOINT:MINIO_PORT/bucket/chave` — em produção,
  `https://minio.gwan.cloud:443/gwan-mart-uploads/...`, que é público se a policy deixar.
- A loja é React/Vite + Tailwind, sem biblioteca de formulário nem de componentes.

## Goals / Non-Goals

**Goals:**
- Cadastrar e manter o catálogo sem sair de `mart.gwan.cloud`.
- Nenhuma env nova e nenhum passo manual obrigatório no deploy.

**Non-Goals:**
- Regras de papel novas (ficam na `lock-role-assignment`).
- Limpeza de fotos órfãs no MinIO.

## Decisions

### D1 — A área do lojista vive na loja, em `/admin`, no mesmo bundle
Rotas novas no React Router da loja, sem segundo app nem segundo domínio. O nginx da loja já faz
fallback de SPA (`try_files ... /index.html`), então `/admin/...` funciona sem mudar deploy.
*Alternativa*: `admin.mart.gwan.cloud` separado. Rejeitada: DNS, router e stack a mais para um
punhado de telas usadas por uma pessoa.

### D2 — Token em `localStorage`, validado pelo `/auth/profile` ao entrar
O JWT dura 24 h. A loja guarda o token e, ao abrir a área, chama `/auth/profile` para saber o
papel **atual** (a `JwtStrategy` relê o usuário do banco). Qualquer 401 encerra a sessão.
*Alternativa*: cookie `httpOnly`. Rejeitada nesta change: exigiria rota de login nova com
`Set-Cookie`, CORS com credenciais e CSRF — vale quando houver mais de um lojista.
*Trade-off aceito*: um XSS na loja leria o token. A loja não renderiza HTML de terceiros (o chat
usa `react-markdown` sem `rehype-raw`).

### D3 — Upload numa rota própria, antes de salvar o produto
`POST /api/products/images` (`FileInterceptor('file')`, limite 5 MB no multer, tipo conferido
pelo `mimetype` **e** pela assinatura dos primeiros bytes) devolve `{ url }`. O formulário sobe
cada foto ao escolhê-la e guarda só as URLs; o produto é salvo depois, com a lista.
*Alternativa*: multipart no próprio `POST /products`. Rejeitada: mistura validação de arquivo com
a do DTO, e a edição precisaria do mesmo tratamento duas vezes.
*Custo assumido*: foto enviada e formulário abandonado vira objeto órfão no bucket.

### D4 — Leitura pública só de `products/*`, aplicada pela API no boot
`ensureBucketExists` passa a aplicar uma bucket policy com `s3:GetObject` anônimo restrito a
`arn:aws:s3:::<bucket>/products/*`. Falha ao aplicar vira `warn` no log, não exceção — a
credencial do app pode não ter `s3:PutBucketPolicy`, e a loja sem foto é melhor que a API fora.
*Alternativa*: bucket inteiro público (`mc anonymous set download`). Rejeitada: o bucket é
genérico e pode receber arquivo que não é de vitrine.
*Alternativa*: servir a foto pela API (proxy). Rejeitada: a API passaria a carregar todo o
tráfego de imagem da vitrine.

### D5 — Edição de fotos: substituir a lista inteira, em transação
O repositório separa `images` do resto antes do `update`, e quando `images` vem definido apaga as
fotos do produto e grava a lista nova na mesma transação. `images: []` limpa; ausência mantém.
A capa (`thumbnail`/`realImage`) é a primeira foto — quem garante é o formulário, que manda os
três coerentes.

### D6 — Dados fiscais opcionais na tela, sem mudar o DTO
O DTO exige NCM, GTIN, fornecedor, custo e descrição do fornecedor, mas aceita string vazia e 0.
O formulário manda `''`/`0` quando o lojista não preenche. Tornar esses campos opcionais no
backend mudaria contrato da importação em lote e do MCP — fica para quando a nota fiscal entrar.

### D7 — Lista do lojista vem de `GET /products/admin/all`
⚠️ *Mudou ao portar para o `main` (2026-11-16)*: era `GET /products/all`, mas a projeção pública
passou a omitir `costPrice`, `supplier` e `gtinEanPackage` — editar a partir dela apagaria esses
valores ao salvar. `GET /products/admin/all` (ADMIN) devolve os campos internos.
Devolve inativos e o catálogo é pequeno (dezenas de itens), então a lista filtra no cliente.
A edição carrega o produto da mesma lista em vez de criar `GET /products/:id`.
*Revisitar* quando o catálogo passar de algumas centenas de itens.

## Risks / Trade-offs

- [`/products/all` é público e expõe produtos inativos] → já era assim antes desta change;
  registrado, não corrigido aqui, porque a loja também usa a rota para montar as categorias.
- [Credencial do app sem permissão de policy] → `warn` no boot e o comando manual no proposal.
- [Escalada de papel ainda aberta (#14)] → qualquer pessoa pode se cadastrar como ADMIN e usar
  esta tela. A tela não piora a falha (a API já aceitava a escrita), mas a torna mais fácil de
  usar. A `lock-role-assignment` continua sendo pré-requisito de divulgar a loja.

## Migration Plan

Sem migration. Deploy normal da stack `gwan-mart` pelo Portainer (API e loja juntas). Conferir
no log do boot que a policy foi aplicada; se não, aplicar à mão uma vez. Rollback: reverter o
commit — a policy de leitura pode ficar, não expõe nada além das fotos.
