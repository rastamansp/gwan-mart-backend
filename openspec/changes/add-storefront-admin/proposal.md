# Proposal — add-storefront-admin

## Why

Issue [#13](https://github.com/rastamansp/gwan-mart-backend/issues/13) — "Trazer o admin de
produtos para mart.gwan.cloud". A loja própria (`mart.gwan.cloud`) já está no ar, mas quem quiser
mudar o catálogo continua dependendo do site institucional (`gwan-ia`). E o que existe lá **não
administra o Mart de produção**. Verificado em 2026-11-16, lendo o clone do `gwan-ia` e sondando
as URLs públicas só com GET:

| Fato | Evidência | Efeito |
|---|---|---|
| O admin do institucional (`/admin/mart`) chama `VITE_API_URL`, não a API do Mart | `product-admin.service.ts` e `MartAdminPage.tsx`. Em produção `VITE_API_URL=https://api.gwan.cloud`, enquanto o Mart está em `mart-api.gwan.cloud` | Toda chamada de catálogo vai para outro backend |
| `https://api.gwan.cloud/products/all` responde `404 page not found` (o 404 do Traefik) | `curl` em 2026-11-16 | A lista e as escritas do admin falham em produção |
| O token do admin é o da sessão do `gwan-backend` (login por link mágico em `api.gwan.cloud`) | `SessionService` + `ProtectedRoute`. A rota só confere "está logado", não o papel | Mesmo com a URL certa, a `JwtStrategy` do Mart não aceita esse token |
| "Atualizar catálogo" e "Busca com IA" mandam o pedido sem `Authorization` | `MartAdminPage.tsx` | Depois da `secure-catalog-write-endpoints`, o primeiro responde 401 |
| Foto entra só como URL digitada. Variação não é editável. Nota média e total de avaliações são campos editáveis | `ProductFormModal.tsx` | Sem upload não há como cadastrar foto, e com nota editável dá para inventar avaliação |

O admin do institucional não funciona, e consertá-lo lá significaria manter a gestão do catálogo
num repo que não é o do Mart. A API, por sua vez, ainda não tem as peças que uma tela de admin
precisa: não há rota de upload de foto; `PUT /products/:id` com `images` responde 500;
`variations` é gravado como `[[]]`; código repetido responde 500; e login com senha errada
responde 500, não 401.

## What Changes

- **Área do lojista na loja, em `mart.gwan.cloud/admin`**, como parte da mesma SPA, carregada sob
  demanda (o código do admin não entra no bundle da vitrine). Telas: login, lista do catálogo
  (inclusive inativos), cadastro e edição. Na lista dá para ativar, desativar, destacar e remover.
- **Formulário em linguagem de loja**: nome, código, preço, preço promocional, estoque,
  categoria, subcategoria, descrição, fotos e variações em primeiro plano. Dados fiscais e de
  fornecedor ficam numa seção recolhível e são opcionais na tela. O desconto é calculado. Nota
  média e total de avaliações **não** aparecem no formulário.
- **A API decide o acesso, a tela só reflete.** Toda rota que esta change cria ou usa para
  escrever exige `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(ADMIN)`, o gate da
  `lock-role-assignment` (#14). Ver Dependências: quem é "administrador de catálogo" é decisão da
  #6.
- **Leitura administrativa em rota própria**: `GET /admin/products` e `GET /admin/products/:id`
  (ADMIN). A lista do lojista deixa de depender da rota pública `GET /products/all`.
- **Upload de foto**: `POST /products/images` (multipart, jpg/png/webp até 5 MB). O tipo é
  conferido pelos primeiros bytes do arquivo, a chave do objeto é única e o arquivo é gravado no
  MinIO sob `products/`. A rota devolve a URL pública. Só o prefixo `products/` do bucket fica
  com leitura anônima.
- **Correções da API sem as quais a tela não funciona**: edição com `images` substitui a lista em
  transação (`[]` remove todas as fotos, ausência mantém); `variations` passa a ter DTO tipado;
  código repetido responde 409; login com credencial errada responde 401 e o login ganha limite
  de tentativas por IP.
- **"Reindexar busca"** na lista: o botão chama a rota existente `POST /products/catalog/update/:id`,
  agora com token e confirmação, porque gasta crédito de embeddings. É o equivalente
  autenticado do botão "Atualizar catálogo" do institucional.
- **Desligar o admin do institucional**: as rotas `/admin/mart*` do `gwan-ia` passam a
  redirecionar para `https://mart.gwan.cloud/admin`, e o código do admin do Mart sai daquele
  repo. É uma mudança no repo `gwan-ia`: aqui ficam só a tarefa e a verificação.
- **Primeiro administrador em produção**: o caminho para criá-lo fica documentado e testado.
  Hoje não existe: a imagem de produção não leva `scripts/`, e o `admin:create` de `origin/main`
  cria `USER`.

**Fora de escopo:**
- Modelo de papéis (manter, renomear ou aposentar o `CORRETOR`, papel separado de catálogo):
  é a issue #6.
- Cadastro de usuário pela tela, troca de senha, recuperação de senha e gestão de papéis.
- Importação em lote (`POST /products/import`) pela tela. O "importar JSON" do institucional
  cria **um** produto de cada vez e não tem equivalente aqui: o formulário cobre o mesmo uso.
- Limpar do MinIO as fotos órfãs (foto enviada num formulário abandonado, foto trocada, produto
  removido).
- Estoque por variação, nota fiscal e pedidos.
- Tirar `costPrice`/`supplier` das rotas públicas (`GET /products`, `/products/all`). O problema
  está registrado no design como risco, e a correção é de outra change.
- Remover a vitrine `/gwan-mart` do institucional. Essa é a `add-mart-storefront`/`port-storefront-features`.

## Relação com trabalho em andamento

A checkout principal tem, **sem commit**, uma change `add-store-product-admin` com implementação
de backend e de `web/` que cobre boa parte deste escopo. Ela foi feita sobre `main`, antes do
`@Roles`. Esta proposta adota as decisões dela que continuam válidas: `/admin` na mesma SPA,
token no navegador validado por `/auth/profile`, upload em rota própria, policy de leitura só
de `products/*` e substituição da lista de fotos em transação. Diverge em seis pontos:

1. o gate de escrita é `@Roles(ADMIN)`, não `CorretorOrAdminGuard`;
2. a lista vem de uma rota administrativa, não de `/products/all`;
3. o admin é carregado sob demanda;
4. a chave do upload é única (a implementação atual gera colisão em envios paralelos);
5. nota e avaliações saem do formulário;
6. entram o desligamento do institucional, o login com 401 e limite de tentativas, e o
   primeiro ADMIN.

O mantenedor precisa decidir qual das duas changes sobrevive (ver Perguntas no `design.md`).

## Capabilities

### New Capabilities
- `storefront-admin`: a área do lojista na loja. Cobre quem entra, o que vê, como cadastra,
  edita e retira produto, e para onde vai quem abre o admin antigo.
- `catalog-admin-api`: o que a API oferece à administração do catálogo. Cobre leitura
  administrativa, upload de foto, edição de fotos e variações, erros previsíveis e login.

### Modified Capabilities
<!-- nenhuma: openspec/specs/ ainda não tem capability arquivada -->

## Impact

- **`web/`**: rotas `/admin/login`, `/admin`, `/admin/produtos/novo`, `/admin/produtos/:id` com
  `React.lazy`; cliente autenticado separado de `lib/api.ts`; link discreto no rodapé; chat
  escondido dentro de `/admin`.
- **`web/nginx.conf`**: `/admin` com `X-Robots-Tag: noindex` e `Cache-Control: no-store`;
  `robots.txt` com `Disallow: /admin`; `Content-Security-Policy` na loja inteira (mitigação do
  token em `localStorage`).
- **`src/products/`**: controller administrativo (`admin/products`), rota de upload, DTO de
  variação, repositório com fotos em transação e 409 para código repetido.
- **`src/shared/infrastructure/services/minio-storage.service.ts`**: policy de leitura do
  prefixo `products/` e chave única.
- **`src/auth/`**: login com 401 e throttler nomeado `login`.
- **Repo `gwan-ia`**: redirecionamento de `/admin/mart*` e remoção de `MartAdminPage`,
  `EditProductPage`, `components/admin/*`, `useProductAdmin`, `product-admin.service` e do item
  "Mart Admin" do menu.
- **Produção**: nenhuma env nova. O deploy é a stack `gwan-mart` pelo Portainer. A policy do
  bucket é aplicada no boot (best-effort), e o primeiro ADMIN é criado uma vez pelo roteiro do
  `design.md`.
- **Tools MCP**: nenhuma rota nova é marcada `x-mcp.enabled`, então o bot não ganha ferramenta
  de escrita.

## Dependências

- **#14 / `lock-role-assignment`**: fornece `@Roles` + `RolesGuard` e fecha a autopromoção. Já
  está em `integ/onda-1`, e sem ela esta change não pode ir ao ar.
- **#6 (papéis, em andamento em paralelo)**: decide se "administrador de catálogo" é o próprio
  `ADMIN` ou um papel separado, e troca o `CorretorOrAdminGuard` das rotas de escrita existentes.
  Esta proposta assume `@Roles(ADMIN)` e concentra a lista de papéis aceitos num lugar só (ver
  D3), para que a decisão da #6 mude uma constante e não as telas.
- **Trabalho não commitado sobre imagens** na checkout principal (`image-signature.ts`,
  `update-product.use-case.ts`, `typeorm-product.repository.ts`, controller, `minio-storage`):
  esta change o reaproveita e não o contradiz. Os ajustes estão nas tasks.
- **Correção do `scripts/create-admin.ts`** (também não commitada na checkout principal): é
  pré-requisito do roteiro do primeiro ADMIN em dev.
