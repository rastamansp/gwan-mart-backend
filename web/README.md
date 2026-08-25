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

## Deploy

Via Portainer, com `docker-compose.production.yml` (na raiz do repo) — o mesmo
arquivo da API. A loja é o serviço `gwan-mart-web`; a API é `gwan-mart-backend`.
**Uma stack só** para o produto inteiro: atualizar a loja é editar as
propriedades da stack existente.

Como as `VITE_*` são baked no build, trocar `MART_API_URL` exige rebuild da
imagem no update da stack — não basta reiniciar.
