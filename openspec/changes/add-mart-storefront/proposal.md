# Proposal — add-mart-storefront

## Why

O Gwan Mart não tem loja própria. O que existe hoje é a área `/gwan-mart` **dentro do site
institucional** (repo `gwan-ia`): vitrine, catálogo, página de produto e chat moram no repo de
outro produto, atrás do domínio `gwan.cloud`.

Isso cobra três preços:

- **Toda mudança de loja passa pelo repo do institucional.** Quem mexe no catálogo precisa
  abrir outro repositório, e um deploy da loja é um deploy do site institucional inteiro.
- **O contrato fica invisível.** A loja consome esta API, mas o código que a consome não vive
  perto dela: quando um endpoint muda, nada aqui acusa. Foi assim que o link de produto do bot
  passou meses apontando para uma rota que o front não tinha.
- **A loja divide domínio com o institucional.** O Mart tem slot próprio (11), API própria
  (`mart-api.gwan.cloud`) e público próprio; hospedá-lo numa subrota de `gwan.cloud` mistura
  vitrine institucional com e-commerce.

A loja passa a viver em **`mart.gwan.cloud`**, neste repositório.

## What Changes

- **Novo diretório `web/`** com a loja: React 18 + Vite + TypeScript + Tailwind, o mesmo padrão
  de frontend do ecossistema (`gwan-ia`). Dev na porta **5184** (slot 11, coluna *web* do mapa
  de portas).
- **Escopo v1 — o que já existe de API**: home com destaques, catálogo com busca, filtro por
  categoria e paginação, página de produto por `code`, e o chat do Mart (`POST /api/chat`) como
  painel lateral. Tudo contra a API real; **sem mock**.
- **Serviço `gwan-mart-web` na stack de produção**: container nginx roteado pelo Traefik em
  `mart.gwan.cloud`, no padrão GWAN (rede `gwan-network`, logging rotacionado, limites) — no
  mesmo `docker-compose.production.yml` da API, para o produto ter **uma stack só** no Portainer.
- **Backend aponta para a loja**: `FRONTEND_URL` passa a `https://mart.gwan.cloud` e
  `FRONTEND_PRODUCT_PATH` a `product` — os links "Ver detalhes" do bot passam a levar à loja, e
  não à área do institucional. É troca de env, sem código, graças a `buildProductUrl()`.
- **CORS** do backend passa a aceitar `mart.gwan.cloud` além de `gwan.cloud`.

### Decisão de estrutura: `web/` neste repo, não monorepo Turborepo

Os apps novos do ecossistema (booker, watt, generative) nascem como monorepo pnpm/Turborepo com
`apps/web` + `apps/api`. Este repo **não** vai ser convertido:

- mover `src/` para `apps/api/` quebra `nest-cli.json`, os paths do `tsconfig`, o `Dockerfile`,
  o `docker-entrypoint.sh` e o caminho `dist/src/main.js` — tudo isso a poucos dias do primeiro
  deploy da API, que ainda não foi validado em produção;
- o ganho do workspace é compartilhar pacote de contratos entre web e api, e aqui o contrato
  já é o OpenAPI publicado em `/api` — não há pacote a compartilhar;
- `web/` com `package.json` próprio dá o que importa (build, deploy e versionamento no mesmo
  repo) sem tocar em nada que já funciona.

Converter para Turborepo continua possível depois, quando a API estiver em produção estável.

**Fora de escopo:** carrinho, checkout, pagamento e login de cliente (a API não tem nada disso
hoje); remover a área `/gwan-mart` do `gwan-ia` (é mudança no repo do institucional — aqui só
deixa de ser o lugar canônico); e a tela de admin de produtos, que segue no institucional até
haver decisão sobre onde o admin do Mart deve morar.

## Capabilities

### Added Capabilities
- `mart-storefront`: a loja do Gwan Mart passa a ser um artefato próprio, versionado e
  publicado junto da API que ela consome.

## Impact

- **`web/`** (novo): app Vite, `Dockerfile` multi-stage (node → nginx), `nginx.conf` com
  fallback de SPA e `/health`.
- **`docker-compose.production.yml`**: passa a declarar **os dois serviços** —
  `gwan-mart-backend` (`mart-api.gwan.cloud`) e `gwan-mart-web` (`mart.gwan.cloud`). A loja
  chegou a ter compose próprio (`docker-compose.web-prod.yml`, removido): como loja e API vivem
  no mesmo repositório, manter dois arquivos significaria manter duas stacks no Portainer para o
  mesmo produto, com a chance de divergirem em rede, labels e variáveis. Uma stack só, dois
  serviços. O preço aceito é que um update da stack toca os dois serviços; não há `depends_on`
  entre eles, porque quem chama a API é o navegador do visitante, não o container da loja.
- **`.env.example`**: `FRONTEND_URL`/`FRONTEND_PRODUCT_PATH` apontando para a loja.
- **`gwan-infra`**: registrar `dominio: mart.gwan.cloud` no `config/gwan-projetos.yml` (slot 11
  está `null`) e criar o registro A — mesmo pré-requisito de `mart-api.gwan.cloud`.
- **Risco baixo no que já roda**: nada em `src/` muda de lugar; a API não sabe que a loja
  existe, exceto pelas duas variáveis de link.
