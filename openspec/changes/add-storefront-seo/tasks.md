# Tasks — add-storefront-seo

## 1. Ícones e meta padrão

- [x] 1.1 `favicon.svg`, `favicon-32.png` e `apple-touch-icon.png` (180 px) em `web/public/`, desenho próprio
- [x] 1.2 `og-default.png` 1200×630 em `web/public/`, gerado de um SVG versionado (fonte da imagem fica no repo)
- [x] 1.3 `index.html`: ícones, `theme-color`, canonical, `og:*` e `twitter:*` padrão com URL absoluta (`VITE_SITE_URL`)
- [x] 1.4 Meta padrão dentro do `block` SSI, seguidas do `include` da prévia por produto

## 2. API — módulo `seo`

- [x] 2.1 Funções puras: escape de HTML/XML, trecho de `<head>` do produto, sitemap
- [x] 2.2 Testes das funções puras (escape, preço promocional, imagem relativa ignorada, inativo fora do sitemap)
- [x] 2.3 `GET /api/seo/products/:code/head` (404 para inexistente/inativo) e `GET /api/seo/sitemap.xml`, fora do Swagger
- [x] 2.4 `ProductsModule` exporta `GetProductByCodeUseCase`; controller de produtos intocado

## 3. nginx da loja

- [x] 3.1 `nginx.conf` vira template (`MART_API_UPSTREAM`, `MART_SITE_URL`), com resolver em tempo de requisição
- [x] 3.2 SSI só em `/product/`, subrequisição interna com timeout curto e queda no `stub`
- [x] 3.3 `/sitemap.xml` por proxy à API; `/robots.txt` direto do nginx
- [x] 3.4 Resolver descoberto no `/etc/resolv.conf` pelo mecanismo da própria imagem (`NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1`), sem script nosso
- [x] 3.5 `Dockerfile` e `docker-compose.production.yml`: `VITE_SITE_URL` / env do nginx

## 4. Título por página

- [x] 4.1 Hook `useDocumentTitle`
- [x] 4.2 Home, catálogo, produto (nome do produto) e "não encontrada"

## 5. Lint da loja

- [x] 5.1 `web/.eslintrc.cjs` (`env: browser`, `no-undef` desligado em TS) — `npm run lint` em `web/` falhava em `main` com 14 falsos positivos

## 6. Validação

- [x] 6.1 `npm run lint`, `npm run build` e `npm test` na API; `npm run lint` e `npm run build` em `web/`
- [x] 6.2 Imagem de produção da loja construída localmente; `curl` prova as meta de `/` e de `/product/:code` sem JS
- [x] 6.3 `curl` de produto inexistente e com a API fora: página servida com as meta padrão
- [x] 6.4 `robots.txt` e `sitemap.xml` respondendo pela loja
- [x] 6.5 Título da aba com o nome do produto, conferido em navegador
- [ ] 6.6 Pós-deploy (não dá para conferir localmente): prévia real colando o link no WhatsApp

## 7. Corrigido durante a validação

- [x] 7.1 Resposta de erro da API **tem corpo** (o JSON do 404), e o SSI incluía esse corpo no `<head>` em vez de usar o `stub` — produto inexistente perdia todas as meta, e `/product/%3Cscript%3E` ecoava `<script>` sem escape dentro do `<head>`. O protótipo não pegou porque usava `return 404` (sem corpo). Agora `proxy_intercept_errors` + `error_page` → 204 vazio → `stub`; conferido com `curl` contra a imagem
- [x] 7.2 `vite.config.ts` usava `process.env`: passava no build local (o `tsc` achava o `@types/node` do `node_modules` da raiz) e quebrava no `docker build`, onde `web/` é o contexto inteiro. Trocado por `loadEnv` + transformação do `index.html`
- [x] 7.3 O `.gitignore` da raiz ignorava qualquer pasta `public` (resíduo de template Gatsby), o que deixaria ícones e imagem de prévia fora do commit — e fora do build da imagem em produção. Exceção `!web/public/`
