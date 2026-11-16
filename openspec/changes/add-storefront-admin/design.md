# Design — add-storefront-admin

## Context

A motivação está em `proposal.md`. O comportamento exigido está em
`specs/storefront-admin/spec.md` e `specs/catalog-admin-api/spec.md`. Abaixo, os fatos do código
(branch `integ/onda-1`, 2026-11-16) que moldam a solução.

**Loja e deploy**
- A loja (`web/`) é React 18 + Vite + Tailwind + React Router 6, sem biblioteca de formulário nem
  de componentes. Todas as páginas são importadas de forma estática em `App.tsx`.
- Produção tem dois hosts: a loja em `mart.gwan.cloud` (nginx) e a API em `mart-api.gwan.cloud`
  (Traefik direto no container). A loja chama a API **cross-origin** por `VITE_MART_API_URL`
  (fixada no build). O nginx da loja **não** faz proxy de `/api`, só de `/sitemap.xml` e da
  subrequisição de SEO. O CORS da API já aceita `https://mart.gwan.cloud`.
- O `location /` do nginx faz fallback de SPA. `/admin/...` já devolve o `index.html` sem
  configuração nova (`https://mart.gwan.cloud/admin` responde 200 hoje e cai no "não encontrado"
  do React).

**Auth e papéis**
- `POST /auth/login` e `GET /auth/profile` respondem **sem** o envelope `{status, data}` das rotas
  de produto. O JWT dura 24 h. A `JwtStrategy` relê o usuário do banco a cada requisição, então
  `req.user.role` é o papel atual.
- Em `integ/onda-1` existem `@Roles(...)` + `RolesGuard` (`lock-role-assignment`). As rotas de
  escrita do catálogo ainda usam `CorretorOrAdminGuard` (ADMIN **ou** CORRETOR), e trocá-lo é
  trabalho da #6.
- Login com senha errada responde 500: o `LoginUserUseCase` lança `Error` comum (achado da
  `lock-role-assignment`, task 5.2). Não há limite de tentativas no login.

**Catálogo**
- `GET /products/all` é **público** e devolve a entidade inteira de **todos** os produtos não
  removidos, inativos inclusive, com `costPrice`, `supplier`, GTIN e NCM. O Swagger diz "ativos",
  mas o `findAll` não filtra. A loja usa essa rota para montar as categorias do catálogo.
- Não existe `GET /products/:id`. O detalhe público é por `code` e filtra ativos.
- `DELETE /products/:id` é soft delete. `code` é `unique` inclusive entre os removidos.
- Imagens: `Product.thumbnail`/`realImage` (colunas, `@IsUrl()`) mais a relação `images`
  (`ProductImage`, `OneToMany`, com `order`). O `update` do repositório passa `images` ao
  `Repository.update` do TypeORM, que não trata relação, e isso dá 500.
- `variations` é `json` e o DTO declara `any[]`. Com o `enableImplicitConversion` do pipe global,
  cada objeto vira `[]`. As variações que existem vieram do seed, direto no banco.
- `MinioStorageService.uploadFile` grava em `<folder>/<Date.now()>-<nome>` e devolve a chave.
  `getFileUrl` monta `protocol://MINIO_ENDPOINT:MINIO_PORT/bucket/chave`. O bucket de produção
  (`gwan-mart-uploads`) é privado.
- O catálogo de produção está vazio (`total: 0`, verificado pela `add-store-product-admin` em
  2026-11-16).

**Trabalho não commitado na checkout principal (`add-store-product-admin`)**
- Ele implementa: upload (`POST /products/images`, `image-signature.ts` com assinatura de
  jpg/png/webp e 5 MB), policy de `products/*` no boot, edição de fotos em transação,
  `ProductVariationDto`, 409 para código repetido e `@IsUrl({ require_tld: false })`. Na `web/`,
  traz `admin-api.ts`, `product-form.ts` e `pages/admin/*`.
- Ele usa `CorretorOrAdminGuard`, carrega a lista de `/products/all` e importa o admin de forma
  estática.
- `uploadFile(buffer, 'foto.<ext>', 'products')` gera chaves `products/<ms>-foto.jpg`. Duas fotos
  enviadas no mesmo milissegundo (o formulário aceita várias de uma vez) **gravam na mesma
  chave**, e a segunda sobrescreve a primeira.

## Goals / Non-Goals

**Goals:**
- Manter o catálogo sem sair de `mart.gwan.cloud` e sem tocar no repo do institucional.
- A API é a única autoridade de acesso: a tela só esconde o que a API recusaria.
- A vitrine não paga pelo admin: nem em bundle, nem em indexação, nem em rota pública nova.
- Desligar o admin do institucional sem deixar link quebrado.

**Non-Goals:**
- Modelo de papéis (#6), gestão de usuários e de senha, importação em lote pela tela, limpeza de
  órfãos no MinIO, estoque por variação.

## Decisions

### D1 — O admin vive na loja, em `/admin`, carregado sob demanda
Rotas novas no React Router da loja: `/admin/login`, `/admin`, `/admin/produtos/novo` e
`/admin/produtos/:id`. Cada página entra com `React.lazy` + `Suspense`, então o chunk do admin
(formulário, upload, cliente autenticado) só é baixado por quem abre `/admin`. O nginx ganha um
`location /admin` com o mesmo fallback, mais `X-Robots-Tag: noindex, nofollow` e
`Cache-Control: no-store`. O `robots.txt` ganha `Disallow: /admin`.

*Alternativa: subdomínio `admin.mart.gwan.cloud`.* Rejeitada. Ela exigiria DNS, router no
Traefik, entrada no CORS e um segundo build para um punhado de telas usadas por uma pessoa. O
ganho de isolamento seria real (origem separada protege o token de um XSS na vitrine), mas a
vitrine não renderiza HTML de terceiros (o chat usa `react-markdown` sem `rehype-raw`), e a CSP
de D2 cobre o resto. Revisitar quando houver mais de um lojista ou conteúdo de terceiros na
vitrine.

*Alternativa: consertar o admin do `gwan-ia`.* Rejeitada. Seria trocar URL, token e guarda de
rota num repo que não é do Mart, e a #13 existe justamente para tirar essa dependência.

*Alternativa: mesma SPA sem code-splitting* (o que a implementação em andamento faz). Rejeitada.
Todo visitante da vitrine baixaria o formulário de admin, e a loja tem SEO e prévia de link
(`add-storefront-seo`) como prioridade.

### D2 — Token JWT em `localStorage`, validado por `/auth/profile`, com CSP na loja
O login guarda o `access_token`. Ao entrar na área, a tela chama `/auth/profile` para saber o
papel **atual**. Qualquer 401 apaga o token e leva ao login com `?next=` da tela pedida. "Sair"
apaga o token. A expiração é a do JWT (24 h). Não há refresh.

Mitigação do risco de um XSS ler o token: `Content-Security-Policy` servida pelo nginx em toda a
loja, com `script-src 'self'`, `object-src 'none'`, `base-uri 'self'` e `frame-ancestors 'self'`.
`img-src 'self' https: data:` acompanha as fotos externas do catálogo atual, e
`connect-src 'self' https:` evita env nova no nginx. O build do Vite não tem script inline, e o
bloco de SSI de SEO só emite `<meta>`.

*Alternativa: cookie `httpOnly`.* Rejeitada nesta change. Ela pede rota de login com
`Set-Cookie`, CORS com credenciais entre `mart.gwan.cloud` e `mart-api.gwan.cloud` (já
`credentials: true`, mas com `SameSite` cross-site) e defesa de CSRF nas escritas. É trabalho de
auth que vale quando houver mais de um lojista ou sessão de cliente final.

*Alternativa: `sessionStorage`.* A exposição a XSS é a mesma. O ganho seria fechar a sessão com
a aba, ao custo de perdê-la quando o lojista abre um produto em outra aba. Fica como pergunta (Q4).

### D3 — Gate `@Roles(ADMIN)`, com a lista de papéis num só lugar
Toda rota **nova** desta change (`POST /products/images`, `GET /admin/products`,
`GET /admin/products/:id`) usa `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...CATALOG_ADMIN_ROLES)`,
com `CATALOG_ADMIN_ROLES = [UserRole.ADMIN]` exportado de um módulo só (ex.:
`src/products/catalog-admin-roles.ts`). O front usa o **mesmo** conjunto para decidir se mostra
as telas ou o aviso "Sua conta não tem acesso ao catálogo". Ele lê o papel do `/auth/profile`.

As rotas de escrita **existentes** (`POST`/`PUT`/`DELETE /products`, `import`,
`catalog/update`) continuam com o guard que a #6 deixar. Se a #6 terminar antes, esta change só
usa a constante. Se terminar depois, a #6 troca a constante e as rotas existentes juntas. Em
nenhum dos casos a tela muda.

*Alternativa: liberar o admin para `CORRETOR` também*, como a implementação em andamento. Por
ora rejeitada: é exatamente a pergunta da #6, e responder "sim" aqui seria decidi-la por tabela.

### D4 — Leitura administrativa em rotas próprias, não em `/products/all`
`GET /admin/products` devolve todos os produtos não removidos (ativos e inativos), com fotos
ordenadas, ordenados por `updatedAt` desc. `GET /admin/products/:id` devolve um produto por `id`,
ativo ou não, e responde 404 se não existir ou estiver removido. As duas ficam num controller
`admin/products` dentro do módulo `products`, e não sob `/products/...`, para não disputar a
ordem com `GET /products/:code` (o mesmo problema que a `/products/stats` precisou contornar). A
filtragem por texto na lista é do cliente: o catálogo tem dezenas de itens.

*Alternativa: usar `GET /products/all`* (a implementação em andamento). Rejeitada por dois
motivos. A tela ficaria dependendo de uma rota pública que só devolve inativos por um defeito:
quem corrigir a rota para cumprir o Swagger ("ativos") faria o admin perder os inativos sem
nenhum erro. E a edição de um produto inativo precisaria buscá-lo na lista inteira.

O vazamento de `costPrice`/`supplier` nas rotas públicas é anterior a esta change e continua
existindo. Está nos Riscos e na Q6.

### D5 — Upload em rota própria, antes de salvar, com chave única
`POST /products/images` (`FileInterceptor('file')`, `limits: { fileSize: 5 MB, files: 1 }`). O
tipo é decidido pela **assinatura dos primeiros bytes** (jpg/png/webp, `image-signature.ts`),
não pelo `mimetype` do cliente. A resposta é `{ url }`. A chave do objeto é
`products/<uuid>.<ext>`, com `randomUUID()` no lugar do timestamp + nome. O formulário sobe cada
foto ao escolhê-la, mostra a prévia e guarda só as URLs. O produto é salvo depois, com a lista.

O 413 (arquivo grande) vem do multer e precisa ser mapeado para 413, não 500 nem 400. A
implementação em andamento diz que confere isso, e o teste o mantém.

*Alternativa: multipart no próprio `POST /products`.* Rejeitada. Misturaria validação de arquivo
com a do DTO, e a edição precisaria do mesmo tratamento duas vezes.

*Alternativa: URL pré-assinada do MinIO para o navegador subir direto.* Rejeitada. A loja teria
que alcançar o MinIO de produção com uma credencial de escrita temporária, e a API perderia a
checagem da assinatura dos bytes. Para fotos de poucos MB, passar pela API custa pouco.

*Custo assumido:* foto enviada num formulário abandonado vira objeto órfão.

### D6 — Leitura pública só de `products/*`, aplicada pela API no boot
Ao iniciar, `MinioStorageService` aplica uma bucket policy com `s3:GetObject` anônimo restrito a
`arn:aws:s3:::<bucket>/products/*`. Se falhar (a credencial do app pode não ter
`s3:PutBucketPolicy`), registra `warn` com o comando manual e a API sobe igual: loja sem foto é
melhor que API fora.

⚠️ `setBucketPolicy` **substitui** a policy inteira do bucket. Se o `gwan-mart-uploads` de
produção tiver uma policy aplicada à mão, ela some. Antes do deploy, a task 6.2 lê a policy atual
(`mc anonymous get-json`), só leitura.

*Alternativa: bucket inteiro público.* Rejeitada: o bucket é genérico. *Alternativa: servir a
foto pela API.* Rejeitada: a API carregaria todo o tráfego de imagem da vitrine.

### D7 — Fotos: a lista substitui, em transação, e a primeira é a capa
O repositório separa `images` antes do `update`. Com `images` definido, apaga as fotos do produto
e grava a lista nova na mesma transação: `[]` remove todas, ausência mantém. A **capa**
(`thumbnail` e `realImage`) é a primeira foto da lista. Quem envia os três coerentes é o
formulário. A API não deriva um do outro, para não mudar o contrato do `import` nem o do MCP.

*Alternativa: a API derivar `thumbnail`/`realImage` de `images[0]`.* Mais robusta, porém muda o
comportamento de quem já manda os três (importação, seed). Fica como pergunta (Q5).

### D8 — Variações com DTO tipado, na forma que a loja já lê
`ProductVariationDto { nome: string (≤120), cor?: string (≤60), disponivel?: boolean }`, com
`@ValidateNested({ each: true })` + `@Type`. A cor é texto livre, porque a página do produto
mostra a cor escrita. Não há estoque nem preço por variação.

### D9 — O formulário pede o que a loja usa e não deixa inventar avaliação
São obrigatórios na tela: nome, código, preço, estoque, categoria, subcategoria, descrição e ao
menos uma foto. NCM, GTIN, fornecedor, custo e descrição do fornecedor ficam numa seção
recolhível, opcionais. Vazio vai como `''`/`0`, porque o DTO exige o campo mas aceita vazio. O
desconto é calculado de preço e promoção, e promoção maior ou igual ao preço é recusada.
`averageRating` e `totalReviews` **não aparecem**: são agregados de avaliação, e o admin do
institucional permitir editá-los é o defeito que esta tela não deve herdar. Tirar esses campos
do DTO de escrita é a Q7.

### D10 — Login responde 401 e tem limite de tentativas
`LoginUserUseCase` passa a lançar `UnauthorizedException` para usuário inexistente ou senha
errada, com a mesma mensagem nos dois casos para não revelar quais e-mails existem. `POST
/auth/login` ganha `ThrottlerGuard` com config nomeada `login`, no padrão da `semantic-search`
(`LOGIN_LIMIT`/`LOGIN_TTL_MS`, default 5 por minuto por IP). Os defaults funcionam sem env. A
tela de login agora é pública e linkada no rodapé, e por isso precisa disso.

### D11 — Desligar o admin do institucional por redirecionamento, depois do novo no ar
Ordem: (1) esta change em produção; (2) o primeiro ADMIN criado e o percurso completo feito em
`mart.gwan.cloud/admin`; (3) no repo `gwan-ia`, as rotas `/admin/mart` e
`/admin/mart/product/:code/edit` viram um componente que faz
`window.location.replace('https://mart.gwan.cloud/admin')` (edição vai para a lista, porque o id
do produto não está na URL antiga, só o código). O item "Mart Admin" sai do menu, e
`MartAdminPage`, `EditProductPage`, `components/admin/*`, `useProductAdmin` e
`product-admin.service` são removidos. Os redirecionamentos ficam por pelo menos um ciclo de
deploy, para quem tiver o link salvo.

Não há janela de risco na troca, porque o admin antigo **já não funciona** em produção
(`api.gwan.cloud` responde o 404 do Traefik, verificado em 2026-11-16). Desligá-lo não tira
capacidade de ninguém.

*Alternativa: remover sem redirecionar.* Rejeitada: link salvo cairia num 404 do institucional
sem dizer para onde o admin foi.

### D12 — Primeiro ADMIN em produção por roteiro, não por rota
A imagem de produção não copia `scripts/`, então `npm run admin:create` não roda no container. O
caminho proposto, depois do deploy, é este: (a) o mantenedor se cadastra pela API
(`POST /auth/register`, nasce `USER`); (b) uma operação ad-hoc, confirmada antes, promove a conta
no banco (`docker exec` no PostgreSQL da P0 com `UPDATE users SET role='ADMIN' WHERE email=...`);
(c) os próximos administradores saem de `PUT /users/:id/promote`, que já exige ADMIN. O roteiro
fica no `DEPLOY.md`.

*Alternativa: copiar `scripts/` para a imagem e rodar `admin:create` por `docker exec`.* É
viável (o `ts-node` já está na imagem), mas aumenta a imagem para um uso único e depende da
correção do `create-admin.ts` ainda não commitada. Fica como pergunta (Q3).

*Alternativa: "o primeiro usuário cadastrado vira ADMIN".* Rejeitada: `/auth/register` é
público, e quem chegasse primeiro ganharia o catálogo.

## Risks / Trade-offs

- **Token em `localStorage` lido por XSS.** Mitigado pela CSP (D2) e pela ausência de HTML de
  terceiros na vitrine. Aceito enquanto houver um lojista.
- **`/products/all` e `/products` públicos expõem `costPrice`, `supplier`, GTIN e produtos
  inativos.** É anterior a esta change. Com o admin na loja, o catálogo vai começar a receber
  dados reais de custo, e o problema deixa de ser teórico. Fica registrado na Q6, para uma change
  própria antes de cadastrar custo de verdade.
- **A policy do bucket sobrescreve uma eventual policy manual.** Coberto pela leitura prévia (task
  6.2).
- **Objetos órfãos no MinIO** (formulário abandonado, foto trocada, produto removido). Aceito. O
  volume esperado é de dezenas de fotos.
- **Embeddings desatualizados depois de editar.** A busca semântica e o chat usam os chunks
  gerados por `POST /products/catalog/update/:id`. A tela oferece "Reindexar busca" (ADMIN, com
  confirmação, porque gasta crédito da OpenAI). Sem embeddings, a busca cai no texto
  (`fix-semantic-search-without-embedding`), então esquecer de reindexar não quebra nada.
- **A #6 conclui "papel separado" depois desta change.** Muda a constante de D3 e o seed do
  primeiro admin, mas as telas ficam como estão.
- **Duas changes para a mesma issue** (`add-store-product-admin` sem commit, e esta). Arquivar as
  duas criaria capabilities sobrepostas (`store-product-admin` e `storefront-admin`). Resolver
  antes de implementar (Q1).

## Migration Plan

Não há migration de banco: `variations` já é `json`, e `product_images` já existe.
1. Deploy normal da stack `gwan-mart` pelo Portainer (API e loja juntas).
2. Conferir no log do boot a linha da policy. Se vier o `warn`, aplicar a policy à mão uma vez.
3. Criar o primeiro ADMIN pelo roteiro de D12.
4. Fazer o percurso completo em `mart.gwan.cloud/admin`.
5. Só então, PR no `gwan-ia` com o redirecionamento (D11).

**Rollback:** redeploy da versão anterior pelo Portainer. A policy de leitura de `products/*`
pode ficar, porque não expõe nada além das fotos. O redirecionamento do `gwan-ia` aponta para uma
rota que, sem a change, cai no "não encontrado" da loja, o que é o mesmo nível de quebra do admin
antigo de hoje.

## Perguntas para o mantenedor (responder antes de implementar)

1. **Qual change sobrevive?** A checkout principal tem a `add-store-product-admin` implementada e
   sem commit. Recomendação: commitar a implementação como base, ajustá-la às divergências desta
   change (gate, rota administrativa, lazy, chave única, avaliações) e manter uma pasta só, esta
   ou aquela renomeada. A alternativa é arquivar a `add-store-product-admin` como está e abrir
   esta como sequência. Isso gera duas capabilities para a mesma área.
2. **Papel de catálogo (#6):** a tela é só para `ADMIN` ou também para um papel de catálogo
   (`CORRETOR` renomeado, `CATALOG_MANAGER`...)? Esta proposta assume `ADMIN` até a #6 decidir.
3. **Primeiro ADMIN em produção:** roteiro com `UPDATE` ad-hoc no banco (D12, recomendado) ou
   `scripts/` dentro da imagem com `admin:create`?
4. **Sessão:** `localStorage` (sobrevive a fechar a aba, recomendado) ou `sessionStorage`
   (encerra com a aba)? E vale TTL menor que 24 h para o token de admin?
5. **Capa:** manter o formulário como responsável por `thumbnail`/`realImage` = primeira foto
   (D7), ou a API passar a derivá-los de `images[0]`?
6. **Custo e fornecedor públicos:** abrir agora a change que tira `costPrice`/`supplier`/GTIN das
   rotas públicas e filtra inativos de `/products/all`, antes do primeiro cadastro real?
7. **Avaliações:** além de tirar do formulário, a API deve recusar `averageRating`/`totalReviews`
   na escrita, com 400 como a `lock-role-assignment` fez com `role`? Isso afeta `import` e seed.
8. **Reindexar:** o botão "Reindexar busca" entra (proposto, ADMIN e com confirmação) ou a
   reindexação fica automática ao salvar, ou manual por Swagger?
9. **Remoção:** soft delete deixa o `code` reservado para sempre (409 ao reusar). A tela deve
   oferecer "restaurar removido", ou aceitar que o código não volta?
