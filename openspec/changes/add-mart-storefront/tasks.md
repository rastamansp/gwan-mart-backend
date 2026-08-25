# Tasks — add-mart-storefront

## 1. Base do app

- [x] 1.1 `web/` com Vite + React 18 + TypeScript + Tailwind, porta de dev 5184 (slot 11)
- [x] 1.2 Cliente de API único (`VITE_MART_API_URL`), que desembrulha o envelope `{ status, data }` da API em um lugar só
- [x] 1.3 Tipos de produto derivados do que a API devolve (`code`, `name`, `originalPrice`, `promotionalPrice`, `thumbnail`, `images`, `category`, `stock`, `averageRating`)
- [x] 1.4 `.env.example` do front e documentação de como rodar contra a API local (`:3011`)

## 2. Telas

- [x] 2.1 Home: destaques (`GET /api/products/featured`) e categorias
- [x] 2.2 Catálogo: busca, filtro por categoria e paginação (`GET /api/products`)
- [x] 2.3 Produto: detalhe por código (`GET /api/products/:code`), galeria e preço com desconto
- [x] 2.4 Chat como painel, com `sessionId` preservado; a resposta vem em Markdown e é renderizada (react-markdown + remark-gfm) — como texto puro aparecia `##` e `**` na tela
- [x] 2.5 Estados de carregando, vazio e erro em cada tela — a API pode estar fora

## 3. Publicação

- [x] 3.1 `Dockerfile` multi-stage (node:20-alpine → nginx:alpine) com as `VITE_*` como build args
- [x] 3.2 `nginx.conf` com fallback de SPA, gzip, headers de segurança e `/health`
- [x] 3.3 Serviço `gwan-mart-web` no padrão GWAN (Traefik em `mart.gwan.cloud`, logging rotacionado, limites) — **dentro do `docker-compose.production.yml`**, e não em compose próprio: uma stack só no Portainer para o produto inteiro
- [x] 3.4 Backend: `FRONTEND_URL=https://mart.gwan.cloud` e `FRONTEND_PRODUCT_PATH=product`; CORS aceitando o novo domínio

## 4. Registro no ecossistema

- [x] 4.1 `config/gwan-projetos.yml` (gwan-infra): `dominio: mart.gwan.cloud` no slot 11
- [ ] 4.2 Registro A de `mart.gwan.cloud` → 187.127.5.72 — **pendente, ação do mantenedor**

## 5. Validação

- [x] 5.1 `npm run build` do `web/` sem erro de tipo
- [x] 5.2 Dev server em 5184 listando os produtos reais da API local
- [x] 5.3 Página de produto abrindo pelo `code` que o bot devolve no link
- [x] 5.4 Chat respondendo dentro da loja, com produtos do catálogo

## 6. Descoberto ao validar

- [x] 6.1 O link "Ver detalhes" do bot vira navegação interna quando aponta para a própria loja (mesma origem) — recarregar a página perderia a conversa aberta
- [x] 6.2 `/chat` não usa o envelope `{ status, data }` das rotas de catálogo: responde `{ answer, sessionId }` na raiz
- [x] 6.4 O compose separado da loja foi revertido para stack única a pedido do mantenedor (menos superfície de divergência no Portainer)
- [x] 6.3 Decimais chegam como string (`numeric` do PostgreSQL) — `toNumber()`/`formatPrice()` centralizam a conversão
