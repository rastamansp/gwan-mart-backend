# Proposal — add-store-product-admin

## Why

Hoje, para cadastrar produto no Mart, é preciso abrir o Swagger, fazer login à mão, colar o token
e montar um JSON com 16 campos obrigatórios — vários deles fiscais (NCM, GTIN) que a loja não
exibe. Imagem só entra como URL já hospedada em algum lugar, porque a API não aceita upload.
O catálogo de produção está **vazio** (verificado em 2026-11-16, `total: 0`), e isso é o motivo.

Fatos verificados em 2026-11-16 que entram no escopo:

| Fato | Efeito |
|---|---|
| A API não tem rota de upload de imagem | Quem cadastra precisa hospedar a imagem fora antes |
| O bucket `gwan-mart-uploads` é **privado** em produção | Mesmo com upload, a imagem não abriria na loja |
| `PUT /api/products/:id` com `images` responde **500** | Não dá para trocar as fotos de um produto já cadastrado |

É a issue #13 ("Trazer o admin de produtos para mart.gwan.cloud").

## What Changes

- **Área do lojista na loja** (`mart.gwan.cloud/admin`): login, lista de produtos (inclusive
  inativos), cadastro, edição, ativar/desativar, destaque e remoção.
- **Formulário em linguagem de loja**: nome, preço, preço promocional, estoque, categoria,
  descrição, fotos e variações em primeiro plano; dados fiscais e de fornecedor numa seção
  recolhível, opcionais na tela. O desconto é calculado a partir dos dois preços.
- **Upload de foto** — `POST /api/products/images` (multipart, ADMIN, jpg/png/webp,
  até 5 MB) grava no MinIO sob `products/` e devolve a URL pública.
- **Leitura pública só do prefixo `products/`** do bucket, aplicada pela própria API no boot
  (best-effort, sem derrubar o processo se a credencial não puder alterar a policy). O resto do
  bucket continua privado.
- **Edição com fotos deixa de dar 500**, e mandar `images: []` remove todas as fotos.
- **Três defeitos da API achados na implementação**, corrigidos aqui porque a tela não
  funcionaria sem eles: variações eram gravadas como `[[]]` (nunca funcionaram pela API),
  código repetido respondia 500 em vez de 409, e `@IsUrl()` recusava a URL de foto do MinIO de
  dev (`localhost`).

**Fora de escopo:**
- Fechar a escalada de papel — é a change `lock-role-assignment` (#14). A área do lojista confia
  nos guards que já existem no backend (`@Roles(ADMIN)`, desde a #6); a tela só esconde o que o
  usuário não pode fazer, quem decide é a API.
- Remover o admin do `gwan-ia` (`/gwan-mart`) — passo seguinte da #13, depois desta no ar.
- Cadastro de usuários pela tela, troca de senha, importação em lote por planilha.
- Apagar do MinIO as fotos órfãs (produto removido ou foto trocada).

## Capabilities

### New Capabilities
- `store-product-admin`: administração do catálogo pela loja — quem entra, o que vê, como
  cadastra, edita e retira produto, e como as fotos chegam ao storage e à vitrine.

### Modified Capabilities
<!-- nenhuma: openspec/specs/ ainda não tem capability arquivada -->

## Impact

- **`web/`**: rotas `/admin/login`, `/admin`, `/admin/produtos/novo`, `/admin/produtos/:id`;
  cliente de API com token; link discreto no rodapé.
- **`src/products/infra/products.controller.ts`**: rota de upload.
- **`src/shared/infrastructure/services/minio-storage.service.ts`**: policy de leitura do prefixo.
- **`src/products/infrastructure/repositories/typeorm-product.repository.ts`** e
  **`update-product.use-case.ts`**: edição com fotos.
- **Produção**: nenhuma env nova. A policy é aplicada no primeiro boot após o redeploy; se a
  credencial do app não tiver permissão, o log avisa e a policy precisa ser aplicada uma vez à
  mão (`mc anonymous set download local/gwan-mart-uploads/products`).
