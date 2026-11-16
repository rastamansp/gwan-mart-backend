# Loja do Gwan Mart (`web/`)

Frontend de **mart.gwan.cloud**. Vive neste repositório, ao lado da API que ele
consome — mudar a loja não passa mais pelo repo do site institucional.

## Rodar em dev

```bash
npm install
npm run dev        # http://localhost:5184
```

Precisa da API no ar (`:3011`, na raiz do repo). O `.env.local` aponta para ela:

```
VITE_MART_API_URL=http://localhost:3011/api
```

## Telas

| Rota | O que faz | API |
|---|---|---|
| `/` | Destaques e categorias | `GET /products/featured` |
| `/catalog` | Busca, filtro por categoria e paginação (estado na URL) | `GET /products` |
| `/product/:code` | Detalhe pelo código de negócio | `GET /products/:code` |
| — | Assistente (painel flutuante), com sessão preservada | `POST /chat` |

`/product/:code` é **a mesma rota** que o backend monta em `buildProductUrl()`
(`FRONTEND_URL` + `FRONTEND_PRODUCT_PATH`). Mudar uma sem a outra quebra todo
link "Ver detalhes" que o bot devolve.

## Detalhes que economizam tempo

- **O envelope da API fica em `src/lib/api.ts`.** Catálogo responde
  `{ status, data }`, mas `/chat` responde `{ answer, sessionId }` na raiz —
  nenhuma tela deve conhecer essa diferença.
- **Decimais chegam como string** (`numeric` do PostgreSQL): use `toNumber()` /
  `formatPrice()`, nunca compare direto.
- **As `VITE_*` são baked no build.** Trocar a URL da API em produção exige
  rebuild da imagem, não só restart da stack.
- **Preço promocional só vale se for menor que o original** — `effectivePrice()`
  centraliza essa regra.

## Prévia de link (SEO)

Quem monta a prévia de um link (WhatsApp, Telegram, buscadores) **não executa
JavaScript** — lê o HTML cru. Por isso:

- **Meta padrão** (`og:*`, `twitter:*`, canonical) estão no `index.html`, com a
  origem pública vinda de `VITE_SITE_URL` (default `https://mart.gwan.cloud`).
- **Prévia por produto**: em `/product/:code` o nginx liga **SSI** e troca o
  bloco de meta padrão pelo `<head>` do produto, pedido à API pela rede interna
  (`GET /api/seo/products/:code/head`). Qualquer falha — produto inexistente,
  API fora — cai nas meta padrão; a página abre de qualquer jeito. Não remova os
  comentários `<!--# block -->` / `<!--# include -->` do `index.html`: são eles.
- **`/robots.txt`** sai do próprio nginx; **`/sitemap.xml`** é repassado à API
  (`GET /api/seo/sitemap.xml`, produtos ativos).
- **Título da aba** por página: `useDocumentTitle()` em `src/lib/`.

Em `npm run dev` não há nginx, então a prévia por produto só existe na imagem.
Para conferir sem o WhatsApp: `curl -s https://mart.gwan.cloud/product/PROD-001 | grep og:`.

O nginx da imagem lê do ambiente (template + `envsubst` do `nginx:alpine`):

| Variável | Default | Para quê |
|---|---|---|
| `MART_API_UPSTREAM` | `gwan-mart-backend:3011` | API na rede interna (prévia e sitemap) |
| `MART_SITE_URL` | `https://mart.gwan.cloud` | `Sitemap:` do `robots.txt` |

**Ícones e imagem de prévia** ficam em `public/`. A imagem 1200×630 é gerada de
`brand/og-default.svg`, e os PNG do ícone de `public/favicon.svg`:

```bash
# Git Bash, de dentro de web/
docker run --rm -v "$(pwd -W):/work" -w //work alpine:3.20 sh -c \
  "apk add --no-cache -q rsvg-convert font-dejavu && \
   rsvg-convert -w 1200 -h 630 brand/og-default.svg -o public/og-default.png && \
   rsvg-convert -w 32 -h 32 public/favicon.svg -o public/favicon-32.png && \
   rsvg-convert -w 180 -h 180 -b '#18181b' public/favicon.svg -o public/apple-touch-icon.png"
```

## Deploy

Via Portainer, com `docker-compose.production.yml` (na raiz do repo) — o mesmo
arquivo da API. A loja é o serviço `gwan-mart-web`; a API é `gwan-mart-backend`.
**Uma stack só** para o produto inteiro: atualizar a loja é editar as
propriedades da stack existente.

Como as `VITE_*` são baked no build, trocar `MART_API_URL` (ou `MART_SITE_URL`,
que também vira `VITE_SITE_URL`) exige rebuild da imagem no update da stack —
não basta reiniciar. `MART_SITE_URL` na loja e `FRONTEND_URL` na API devem ser
o mesmo endereço: um monta as meta padrão, o outro as do produto e o sitemap.
