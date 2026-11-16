# Design — add-storefront-seo

## Contexto

A loja é uma SPA React/Vite servida por nginx (`web/`), no mesmo compose da API
(`docker-compose.production.yml`, stack única). Todo HTML que o nginx devolve é o mesmo
`index.html`; o conteúdo só aparece depois que o JavaScript roda e chama a API.

Quem monta a prévia de link — WhatsApp, Telegram, Facebook, LinkedIn, X, Slack, Discord, e os
crawlers de busca na primeira passada — lê o HTML **cru**. Para eles, `/product/PROD-001` é
idêntico a `/`. Meta tags fixas no `index.html` resolvem a home; a prévia **por produto** exige
que algo no servidor escreva as meta daquele produto no HTML antes de entregá-lo.

## Decisão 1 — prévia por produto: SSI do nginx + rota leve da API

**Escolhida.** Em `/product/:code`, o nginx liga o módulo SSI (`ngx_http_ssi_module`, que já vem
na imagem oficial `nginx:alpine`) sobre o próprio `index.html` do build. O `<head>` do
`index.html` tem dois comentários SSI:

```html
<!--# block name="seo_default" --> …meta padrão da loja… <!--# endblock -->
<!--# include virtual="/__seo/product" stub="seo_default" -->
```

- Fora de `/product/`, o SSI está desligado: os dois comentários são HTML comum, ignorado pelo
  navegador, e as meta padrão de dentro do `block` saem como estão. A home, o catálogo e qualquer
  outra rota recebem as meta padrão.
- Em `/product/:code`, o SSI esconde o bloco padrão e faz uma **subrequisição interna** a
  `/__seo/product`, que o nginx encaminha para `GET /api/seo/products/:code/head` na API (rede
  interna da stack). A API devolve só o trecho de `<head>` daquele produto (título, descrição com
  preço, imagem, URL canônica, `og:*`, `twitter:*`), já escapado.
- **Se a subrequisição falhar** — produto inexistente/inativo (404), API fora (502/504), demora
  acima do timeout — o SSI usa o `stub`, ou seja, as meta padrão. **A página nunca deixa de
  abrir por causa da prévia**: o pior caso é a prévia genérica, que é o comportamento de hoje.

Validado num nginx descartável antes de implementar: a subrequisição herda o `$request_uri` da
requisição original (é dele que sai o `:code`), e resposta **vazia** cai no `stub`.

⚠️ **Resposta de erro com corpo NÃO cai no `stub`**: o SSI inclui o corpo do 404 da API (o JSON
de erro, que ecoa o código pedido sem escape) no `<head>`. O protótipo não mostrou isso porque
usava `return 404` sem corpo; apareceu no teste contra a API real. Por isso a subrequisição usa
`proxy_intercept_errors on` e converte todo erro em `204` vazio.

Por que é a mais simples que funciona **na stack atual**:

- **Nenhum container, serviço ou dependência nova** — só um módulo que já está compilado no
  nginx e uma rota GET na API que já existe.
- O HTML continua sendo **o `index.html` do build** (com os nomes de asset com hash): ninguém
  precisa copiar, baixar ou reconstruir o template em outro lugar.
- Vale para **todo visitante**, não só para robôs: não há detecção de `User-Agent` para manter.

### Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| **`sub_filter` + `auth_request`** (subrequisição devolve as meta em headers, `sub_filter` as troca no HTML) | Funciona, mas espalha o contrato em ~6 headers e 6 substituições que dependem do texto exato do `index.html`; não-ASCII em header exige codificação própria. Mais frágil que um `include` |
| **API devolvendo o `index.html` inteiro** (nginx faz proxy de `/product/*` para a API) | A API não tem o `index.html` do build — teria de buscá-lo na loja pela rede e cacheá-lo, criando dependência circular entre os dois containers |
| **Renderização dinâmica só para robôs** (`map $http_user_agent`) | Lista de `User-Agent` que envelhece, comportamento diferente para pessoa e robô, e o `curl` comum não veria a prévia |
| **Prerender** (build estático por produto ou serviço tipo Rendertron) | Produto novo exigiria rebuild da loja, ou um serviço/container novo — fora do escopo "sem infraestrutura nova" |
| **SSR** (migrar a loja para Next/Remix) | Reescrita da loja para resolver uma prévia |

### Detalhes operacionais

- **Resolução do nome da API em tempo de requisição.** O `proxy_pass` usa variável
  (`$mart_api_upstream`) e um `resolver`, de modo que o nginx **sobe mesmo com a API fora** — com
  nome fixo no `proxy_pass`, o nginx falha no boot se `gwan-mart-backend` ainda não existir na
  rede, e a stack não tem `depends_on` de propósito. O endereço do resolver sai do
  `/etc/resolv.conf` do container no start (em rede Docker definida pelo usuário é o
  `127.0.0.11`) pelo mecanismo da própria imagem oficial
  (`NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1` → `NGINX_LOCAL_RESOLVERS`), sem script nosso.
- **Timeouts curtos** (conexão 2 s, leitura 3 s): a prévia não pode segurar o HTML da página.
- **Configuração por env** do nginx (template do `nginx:alpine`, `envsubst` no start):
  `MART_API_UPSTREAM` (default `gwan-mart-backend:3011`) e `MART_SITE_URL` (default
  `https://mart.gwan.cloud`).
- A loja continua chamando a API **pelo domínio público** no navegador. A rede interna serve só a
  prévia e o sitemap, que são do servidor da loja, não do visitante.
- `Cache-Control: public, max-age=300` nas respostas da API de SEO: o WhatsApp guarda a prévia por
  conta própria, e 5 minutos bastam para preço e nome novos aparecerem.

## Decisão 2 — `sitemap.xml` dinâmico na API, `robots.txt` no nginx

- `GET /api/seo/sitemap.xml` (API) lista `/`, `/catalog` e `/product/:code` de **todo produto
  ativo**, com `lastmod` da última atualização. O nginx entrega em `mart.gwan.cloud/sitemap.xml`
  (proxy pela rede interna). Sem a API, responde erro — melhor um 502 que o crawler repete do que
  um sitemap pela metade.
- `robots.txt` não depende de banco: o nginx responde direto, com `Sitemap:` absoluto montado de
  `MART_SITE_URL`. Libera tudo menos `/__seo/` (que é `internal` de qualquer forma).
- Os endereços do sitemap e das meta saem de `FRONTEND_URL` + `FRONTEND_PRODUCT_PATH` via
  `buildProductUrl()` — os **mesmos** links que o bot manda, regra do `openspec/config.yaml`.

## Decisão 3 — módulo `seo` isolado na API

- `src/seo/`: `SeoModule`, `SeoController` e funções puras (`seo-html.ts`) com teste.
- `@ApiExcludeController()`: as rotas devolvem HTML/XML para o nginx, não fazem parte da API
  pública nem do Swagger. (Elas também não virariam tool do bot: o conversor OpenAPI→MCP só
  inclui operações com `x-mcp.enabled`.)
- Reaproveita `GetProductByCodeUseCase` (que já filtra inativo) e `GetAllProductsUseCase`; para
  isso o `ProductsModule` passa a **exportar** o primeiro. O controller de produtos não muda.
- Escapa todo texto que vem do catálogo antes de pôr no HTML — nome e descrição são dados de
  fornecedor, e o trecho é injetado cru no `<head>` pelo SSI.
- `og:image` do produto: a primeira URL **absoluta** entre `realImage`, `thumbnail` e as imagens
  ativas por ordem; sem nenhuma, a imagem padrão da loja.

## Decisão 4 — título por rota no cliente

Hook `useDocumentTitle(title?)` em `web/src/lib/`, chamado por cada página: `"<título> | Gwan
Mart"`, ou só `"Gwan Mart"` na home. Na página de produto o título é o nome do produto assim que
ele carrega. É o título da **aba**; o da prévia é o do servidor (Decisão 1), e os dois saem do
mesmo nome.

## Riscos

- **Prévia real no WhatsApp só se confere depois do deploy**: o WhatsApp busca a URL pública.
  Localmente prova-se o HTML cru com `curl`.
- **Cache do WhatsApp**: links já compartilhados antes do deploy podem manter a prévia antiga por
  um tempo; não há como invalidar do nosso lado.
- **Imagem de produto em `http://`** (MinIO sem TLS) pode não aparecer na prévia; não é piora em
  relação a hoje, e a loja em produção usa MinIO com TLS.
