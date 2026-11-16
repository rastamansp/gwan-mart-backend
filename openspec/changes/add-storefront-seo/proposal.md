# Proposal — add-storefront-seo

## Why

A loja (`mart.gwan.cloud`) vive de **link compartilhado**: o bot manda o link do produto no
WhatsApp, e a divulgação é feita colando esse link em conversa. Hoje o `web/index.html` só tem
`<title>` e `description`, então o link colado no WhatsApp chega sem imagem e sem título útil — e
um link de produto chega com a mesma prévia genérica da home, porque a loja é uma SPA e quem
monta a prévia (WhatsApp, Telegram, Facebook, crawlers) **não executa JavaScript**.

Também não há favicon (a aba mostra o ícone padrão do navegador), a aba diz "Gwan Mart" em
qualquer página e não existem `robots.txt` nem `sitemap.xml`.

Issue: [#10](https://github.com/rastamansp/gwan-mart-backend/issues/10).

## What Changes

- **Favicon e ícones** próprios do Gwan Mart (SVG + PNG de 32 px e `apple-touch-icon`), sem marca
  de terceiros.
- **Meta tags padrão** no `index.html`: `og:title`, `og:description`, `og:image` (PNG 1200×630
  servido pela própria loja, em URL absoluta), `og:url`, `og:type`, `og:site_name`, `og:locale`,
  `twitter:card` e `link rel="canonical"`.
- **Prévia por produto sem JavaScript**: o HTML servido em `/product/:code` já sai com título,
  descrição (com preço), imagem e URL do produto. O nginx da loja monta isso com **SSI**, pedindo
  o trecho de `<head>` a uma rota nova da API pela rede interna da stack. Se a API estiver fora ou
  o produto não existir, a página sai com as meta padrão — a loja nunca deixa de abrir por causa
  da prévia. Decisão e alternativas em `design.md`.
- **`document.title` por rota**: home, catálogo, produto (com o nome do produto) e "não
  encontrada".
- **`robots.txt`** servido pelo nginx e **`sitemap.xml` dinâmico**, gerado pela API a partir do
  catálogo ativo e entregue pela loja em `/sitemap.xml`.
- **Módulo `seo` na API**, isolado: controller próprio fora do Swagger (não é API pública nem tool
  do bot), reaproveitando os casos de uso de produtos sem alterar o controller de produtos.
- **Lint da loja**: `web/` passa a ter config ESLint própria (`env: browser`, `no-undef` desligado
  em TS, que o `tsc` já cobre). Hoje `npm run lint` em `web/` falha em `main` com 14 falsos
  positivos (`window`/`document` "não definidos").

## Capabilities

### Modified Capabilities
- `mart-storefront`: a loja passa a ter prévia de link (geral e por produto) legível sem
  JavaScript, ícones, título por página, `robots.txt` e `sitemap.xml`.

## Impact

- **`web/`**: `index.html`, `public/` (ícones e imagem OG), `nginx.conf` (vira template com env),
  `Dockerfile` (build arg `VITE_SITE_URL`, env do nginx), hook `useDocumentTitle` e uma linha em
  cada página.
- **API**: `src/seo/` novo (módulo, controller, funções puras com teste) e `ProductsModule`
  passa a exportar `GetProductByCodeUseCase`. Nenhuma migration, nenhuma rota de produtos
  alterada.
- **`docker-compose.production.yml`**: a loja passa a falar com a API **pela rede interna**
  (`gwan-mart-backend:3011`) só para montar a prévia; o resto continua pelo domínio público, e
  continua sem `depends_on`.
- **Sem infraestrutura nova**: nenhum container, serviço externo ou prerender.
