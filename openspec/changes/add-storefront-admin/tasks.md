# Tasks — add-storefront-admin

Dev local: infra em `gwan-infra/apps/mart-backend/docker-compose.dev.yml` (PostgreSQL 5444,
Redis 6391, MinIO 9010). API em `:3011`, loja em `:5184`. Admin de teste: cadastrar pela API e
promover no banco de dev, ou `npm run admin:create` depois da correção do `create-admin.ts`.

**Antes de começar:** responder as perguntas do `design.md`, sobretudo a Q1 (qual change
sobrevive) e a Q2 (papel, #6). Várias tasks abaixo têm implementação pronta, sem commit, na
checkout principal (`add-store-product-admin`), e cada uma diz o que portar e o que ajustar.

## 0. Base

- [ ] 0.1 Decidir a Q1 e trazer para esta branch, **por arquivo**, a implementação da checkout principal que for reaproveitada (`image-signature.ts` + spec, diffs de `product.dto.ts`, `update-product.use-case.ts`, `typeorm-product.repository.ts`, `products.controller.ts`, `minio-storage.service.ts`, `web/src/lib/admin-api.ts`, `web/src/lib/product-form.ts`, `web/src/pages/admin/*`, diff de `web/src/App.tsx`). Verificação: `git diff --stat` lista só esses arquivos; `npm run build` da API e da loja passam
- [ ] 0.2 Criar `CATALOG_ADMIN_ROLES = [UserRole.ADMIN]` num módulo só e usá-lo também no front (D3). Verificação: `grep -rn "CORRETOR" web/src src/products/infra` não encontra papel fixo nas rotas novas nem na tela

## 1. API — leitura administrativa (D4)

- [ ] 1.1 Controller `admin/products` no módulo `products` com `GET /admin/products` (não removidos, ativos e inativos, fotos ordenadas, `updatedAt` desc) e `GET /admin/products/:id` (`ParseIntPipe`, 404 para inexistente ou removido), ambos com `JwtAuthGuard` + `RolesGuard` + `@Roles(...CATALOG_ADMIN_ROLES)` e sem `x-mcp`. Verificação: teste de rota (no padrão de `products-stats.route.spec.ts`) cobre 401, 403, 200 com inativo, 404 para removido; `GET /api/mcp/tools` continua com só duas tools

## 2. API — fotos, variações e erros

- [ ] 2.1 `POST /products/images` com o gate de 0.2 em vez de `CorretorOrAdminGuard` (D3/D5). *Pronto na checkout principal, com o guard antigo.* Verificação: jpg → 201; PDF renomeado para `.jpg` → 400; 8 MB → **413**; sem token → 401; usuário comum → 403
- [ ] 2.2 Chave única no upload: `products/<randomUUID()>.<ext>` (D5). Verificação: teste do serviço de storage mostra chaves distintas para dois envios no mesmo milissegundo; três `curl` paralelos devolvem três URLs que abrem três fotos diferentes
- [ ] 2.3 Policy de leitura de `products/*` no boot, best-effort (D6). *Pronto na checkout principal.* Verificação: URL de 2.1 abre com `curl` sem credencial; objeto fora de `products/` → 403; com credencial sem permissão de policy, a API sobe e o log traz o `warn` com o comando manual
- [ ] 2.4 Edição com `images` em transação (D7). *Pronto na checkout principal.* Verificação: `PUT` com fotos reordenadas → 200 na nova ordem; `{stock}` mantém as fotos; `images: []` remove todas
- [ ] 2.5 `ProductVariationDto` com `@ValidateNested` + `@Type` (D8). *Pronto na checkout principal.* Verificação: `PUT` com duas variações devolve as duas; variação sem `nome` → 400 e o produto não muda
- [ ] 2.6 Código repetido → 409 (`rethrowDuplicateCode`). *Pronto na checkout principal.* Verificação: segundo `POST` com o mesmo código → 409; o mesmo vale para código de produto removido
- [ ] 2.7 `@IsUrl({ require_tld: false })` em `thumbnail`/`realImage`, para aceitar a URL do MinIO de dev. *Pronto na checkout principal.* Verificação: cadastro com foto enviada em dev → 201

## 3. API — login (D10)

- [ ] 3.1 `LoginUserUseCase` lança `UnauthorizedException` com a mesma mensagem para e-mail inexistente e senha errada. Verificação: teste unitário dos dois casos; `curl` com senha errada → 401
- [ ] 3.2 Throttler nomeado `login` (`LOGIN_LIMIT`/`LOGIN_TTL_MS`, default 5/min por IP) em `POST /auth/login`, sem env obrigatória. Verificação: sexta tentativa no mesmo minuto → 429; `.env.example` documenta as duas variáveis como opcionais

## 4. Loja — sessão e estrutura (D1, D2)

- [ ] 4.1 Rotas `/admin/login`, `/admin`, `/admin/produtos/novo`, `/admin/produtos/:id` com `React.lazy` + `Suspense`; chat escondido em `/admin`; link "Área do lojista" no rodapé. Verificação: `npm run build` da loja gera chunk separado para o admin; abrir a home com DevTools → nenhum chunk do admin baixado
- [ ] 4.2 Cliente autenticado (`admin-api.ts`) com o token em `localStorage` (ou conforme a Q4). Ele trata `/auth/*` sem envelope, encerra a sessão em qualquer 401, mostra "E-mail ou senha incorretos" no 401 do login e "Muitas tentativas" no 429. Verificação: senha errada mostra a mensagem certa (depende de 3.1); token apagado à mão → próxima ação leva ao login
- [ ] 4.3 Guarda das rotas `/admin/*`: sem token vai ao login com `next`; com token, `/auth/profile` decide entre telas e aviso de acesso negado usando `CATALOG_ADMIN_ROLES`. Verificação: `/admin/produtos/novo` sem sessão → login → volta ao formulário; usuário comum vê o aviso sem formulário
- [ ] 4.4 `nginx.conf`: `location /admin` com fallback de SPA, `X-Robots-Tag: noindex, nofollow` e `Cache-Control: no-store`; `Disallow: /admin` no `robots.txt`; `Content-Security-Policy` da loja inteira conforme D2. Verificação: `curl -sI <loja>/admin` mostra os dois cabeçalhos; `curl <loja>/robots.txt` traz o `Disallow`; o percurso de 7.2 sem erro de CSP no console, inclusive a prévia de produto (SSI) e as fotos externas do seed

## 5. Loja — catálogo

- [ ] 5.1 Lista em `/admin` a partir de `GET /admin/products`: capa, nome, código, preço, estoque, ativo/destaque, filtro por nome ou código; ações de ativar/desativar, destacar e remover com confirmação. *Pronto na checkout principal, lendo `/products/all`; trocar a fonte.* Verificação: produto desativado → 404 na vitrine e "Inativo" na lista; removido some dos dois
- [ ] 5.2 Formulário de cadastro e edição (D9). Campos da loja em primeiro plano, fiscais recolhidos, desconto calculado, validação de promoção, **sem** nota e avaliações. A edição carrega por `GET /admin/products/:id`. *Pronto na checkout principal; remover nota/avaliações se aparecerem e trocar a carga.* Verificação: cadastro mínimo aparece na vitrine com a primeira foto como capa; promoção ≥ preço bloqueia o envio; o formulário de um produto com avaliações não mostra esses campos
- [ ] 5.3 Fotos no formulário: upload com prévia, várias de uma vez, reordenar, remover, erro por arquivo sem descartar as demais. Verificação: três fotos de uma vez geram três prévias distintas (depende de 2.2); PDF junto com duas fotos → erro nomeado e as duas ficam
- [ ] 5.4 Variações no formulário (nome, cor em texto, disponível). Verificação: variação acrescentada aparece na página do produto
- [ ] 5.5 Botão "Reindexar busca" na lista, com confirmação que avisa o gasto de crédito, chamando `POST /products/catalog/update/:id` com token (ou conforme a Q8). Verificação: com chave de embeddings configurada, mostra produtos processados/erros; sem ela, mostra o erro da API sem quebrar a tela

## 6. Produção (Portainer, nunca SSH para deploy)

- [ ] 6.1 Documentar no `DEPLOY.md` o roteiro do primeiro ADMIN (D12, ou conforme a Q3) e a verificação pós-deploy. Verificação: leitura do `DEPLOY.md`
- [ ] 6.2 **Antes do deploy**, ler (só leitura) a policy atual do bucket de produção (`mc anonymous get-json`) e registrar aqui. Se houver policy manual, ajustar D6 para fundir as regras em vez de substituí-las. Verificação: resultado anotado nesta task
- [ ] 6.3 Redeploy da stack `gwan-mart` pelo Portainer. Conferir no log do boot a linha da policy das fotos; se vier o `warn`, aplicar a policy à mão uma vez. Verificação: `curl -si https://mart-api.gwan.cloud/api/health` → 200; URL de foto enviada abre sem login
- [ ] 6.4 Criar o primeiro ADMIN pelo roteiro de 6.1 (operação ad-hoc confirmada com o mantenedor antes). Verificação: `GET /auth/profile` com o token dele devolve `ADMIN`

## 7. Prova

- [ ] 7.1 API: `npm run lint`, `npm run build` e `npm test` passam, com os testes novos de 1.1, 2.2 e 3.1. Loja: `npm run build` passa. Verificação: saída dos comandos anotada aqui
- [ ] 7.2 Percurso completo em navegador contra a API local e depois contra produção: login → cadastro com duas fotos e uma variação → aparece na vitrine → edição trocando a ordem das fotos → desativar → reativar → remover. Verificação: anotar data e resultado, para os dois ambientes
- [ ] 7.3 Regressão da vitrine: home, catálogo, página de produto, prévia de link (SSI) e chat seguem funcionando, e a home não baixa o chunk do admin. Verificação: anotar

## 8. Desligar o admin do institucional (repo `gwan-ia`, PR próprio, depois do grupo 7)

- [ ] 8.1 Em `gwan-ia`, trocar as rotas `/admin/mart` e `/admin/mart/product/:code/edit` por um redirecionamento para `https://mart.gwan.cloud/admin` (D11); tirar "Mart Admin" do menu (`AppLayout.tsx`); remover `MartAdminPage`, `EditProductPage`, `components/admin/*`, `useProductAdmin` e `product-admin.service`. Verificação: `grep -rn "product-admin\|MartAdminPage\|useProductAdmin" src` vazio no `gwan-ia`; `npm run build` do `gwan-ia` passa
- [ ] 8.2 Depois do deploy do `gwan-ia` pela stack dele no Portainer, abrir `https://gwan.cloud/admin/mart` e um link antigo de edição. Verificação: os dois terminam em `https://mart.gwan.cloud/admin`

## Workflow follow-up

- Fechar a issue #13 no board (Project 11, "Gwan Mart") depois do grupo 8, ou deixá-la aberta só
  com o grupo 8.
- Se a #6 terminar depois desta change, conferir que a troca de papel mudou só
  `CATALOG_ADMIN_ROLES`.
- Arquivar com `openspec archive add-storefront-admin` depois do merge. Se a
  `add-store-product-admin` também for commitada, resolver antes a sobreposição das capabilities
  (Q1).
