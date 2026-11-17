# Tasks — add-store-product-admin

Dev local: infra em `gwan-infra/apps/mart-backend/docker-compose.dev.yml` (PostgreSQL 5444,
Redis 6391, MinIO 9010), API em `:3011`, loja em `:5184`. Admin de teste:
`ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create`.

## 1. Backend

- [x] 1.1 Edição com fotos: o repositório separa `images` antes do `update` e substitui a lista em transação; o use case repassa `images` sempre que vier definido, inclusive `[]` (D5). Verificação: `PUT /products/:id` com `images` responde 200 com as fotos na ordem enviada; com `{stock}` mantém as fotos; com `images: []` remove todas — **feito 2026-11-16**: antes 500, agora 200 nos três casos
- [x] 1.2 `POST /api/products/images` com `FileInterceptor`, limite 5 MB, jpg/png/webp conferidos pela assinatura dos bytes, guardas `JwtAuthGuard` + `RolesGuard` com `@Roles(ADMIN)` (era `CorretorOrAdminGuard` antes da #6), grava em `products/` com nome sorteado (UUID) e devolve `{ url }` (D3). Verificação: jpg → 201 com URL; PDF → 400, arquivo de 8 MB → 413; sem token → 401 — **feito**: os quatro códigos conferidos; `image-signature.spec.ts` cobre a assinatura
- [x] 1.3 Policy de leitura anônima restrita a `products/*` aplicada no boot, com `warn` se falhar (D4). Verificação: a URL devolvida em 1.2 abre com `curl` sem credencial; um objeto fora de `products/` responde 403 — **feito**: 200 e 403; log do boot diz "Leitura pública aplicada às fotos de produto"
- [x] 1.4 *(achado na implementação)* `@IsUrl()` exigia TLD e recusava a URL de foto do MinIO de dev (`localhost:9010`): `thumbnail`/`realImage` passam a `@IsUrl({ require_tld: false })`. Verificação: cadastro com foto enviada em dev responde 201
- [x] 1.5 *(achado)* Código repetido respondia 500 (unique no banco, inclusive entre removidos por soft delete): o repositório traduz `23505` em 409 com mensagem. Verificação: segundo `POST` com o mesmo código → 409 "Já existe um produto com o código…"
- [x] 1.6 *(achado)* **Variações nunca eram gravadas pela API**: `variations?: any[]` + `enableImplicitConversion` do pipe global convertia cada objeto em `[]` e gravava `[[]]` — as variações existentes vinham do seed direto no banco. `ProductVariationDto` (`nome` obrigatório, `cor`, `disponivel`) com `@ValidateNested` + `@Type`. Verificação: `PUT` com duas variações devolve as duas; variação sem `nome` → 400

## 2. Loja — sessão

- [x] 2.1 Cliente de API autenticado (`web/src/lib/admin-api.ts`): login, perfil, upload e CRUD, tratando as rotas sem envelope; 401 encerra a sessão (D2). Verificação: `npm run build` da loja sem erro
- [x] 2.2 `/admin/login` e guarda das rotas `/admin/*`: sem sessão vai ao login e volta à rota pedida; papel sem acesso vê aviso. Verificação: abrir `/admin/produtos/novo` sem sessão → login com `next` → volta ao formulário; usuário comum vê "Sua conta não tem acesso ao catálogo" sem formulário

## 3. Loja — catálogo

- [x] 3.1 `/admin`: lista com foto, nome, código, preço, estoque, ativo/destaque, busca por nome ou código, e ações de ativar/desativar, destacar e remover com confirmação. Verificação: produto desativado respondeu 404 na vitrine e seguiu na lista marcado "Inativo"; removido sumiu dos dois
- [x] 3.2 Formulário de cadastro e edição (`/admin/produtos/novo`, `/admin/produtos/:id`): campos da loja em primeiro plano, fiscais recolhidos (D6), desconto calculado, validação de promoção (rola até o primeiro erro), upload com pré-visualização, reordenar e remover foto, variações com cor em texto (a página do produto mostra a cor escrita). Verificação: cadastro mínimo apareceu na vitrine com a primeira foto como capa e "-11%"; promoção maior que o preço bloqueou o envio
- [x] 3.3 Link "Área do lojista" no rodapé, e o assistente de vendas escondido dentro de `/admin`. Verificação: visível na loja

## 4. Prova

- [x] 4.1 API: `npm run build`, `npm run lint` e `npm test` (3 suítes, 9 testes) passam. Loja: `npm run build` passa; **`npm run lint` da loja falha em arquivos anteriores a esta change** (`ChatPanel`, `CatalogPage`, `main.tsx`: `window`/`document` não definidos) porque herda a config de Node da raiz — fica para uma change de higiene, não foi tocado aqui
- [x] 4.2 Percurso completo contra a API local (Playwright, 2026-11-16): login → cadastro com duas fotos e variação → aparece na vitrine → edição trocando a ordem das fotos e acrescentando variação → desativar → remover

## Workflow follow-up

- Redeploy da stack `gwan-mart` pelo Portainer e conferir no log do boot a policy do bucket
  ("Leitura pública aplicada às fotos de produto"); se vier o `warn`, aplicar à mão uma vez.
- Fechar a issue #13 do board (Project 11, "Gwan Mart") — ou deixá-la aberta só com o passo de
  remover o admin do `gwan-ia`.
- Arquivar com `openspec archive add-store-product-admin` depois do merge.
