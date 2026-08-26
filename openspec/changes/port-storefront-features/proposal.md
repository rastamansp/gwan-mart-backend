# Proposal — port-storefront-features

## Why

A loja em `web/` nasceu com o essencial: vitrine, catálogo, produto e chat. A área
`/gwan-mart` do site institucional (`gwan-ia`), que a loja substitui, tem mais coisa — e uma
delas é **o único caminho de compra que existe hoje**: o pedido pelo WhatsApp.

Enquanto a loja nova não tiver isso, ela é uma vitrine bonita da qual ninguém consegue comprar,
e o institucional continua sendo o lugar onde o negócio acontece. Portar essas funcionalidades
é o que permite apontar `mart.gwan.cloud` como a loja de verdade.

O que existe lá e falta aqui, em ordem de importância:

| Funcionalidade | Onde está hoje | Por que importa |
|---|---|---|
| Pedido por WhatsApp com quantidade, origem do frete, CEP e variação | `ProductPage.tsx` | É a conversão — não há carrinho nem checkout |
| Variações do produto (nome/cor/disponibilidade) | `ProductPage.tsx` | Sem escolher a variação, o pedido chega ambíguo |
| Compartilhar produto (Web Share + cópia do link) | `ProductPage.tsx` | Divulgação é feita por link no WhatsApp |
| Ficha técnica (NCM, GTIN/EAN, disponibilidade) | `ProductPage.tsx` | Comprador de eletrônico confere código antes de fechar |
| Avaliação em estrelas | `ProductPage.tsx`, `MartProductCard` | A API já devolve nota e nº de avaliações; hoje mostramos texto |
| Busca por similaridade (IA), com % de similaridade | `CatalogPage.tsx` | Já existe endpoint (`/products/search/similar`) |
| Filtro por subcategoria e itens por página | `CatalogPage.tsx` | A API aceita mais filtros do que a loja usa |

## What Changes

- **Pedido por WhatsApp** na página de produto: seletor de quantidade, origem do frete, CEP com
  máscara e variação escolhida, tudo montado numa mensagem pronta. O número de destino sai de
  **variável de ambiente** (`VITE_WHATSAPP_NUMBER`) — no institucional ele está escrito no
  código, o que obriga rebuild para trocar e vaza o contato em todo fork do repositório.
- **Variações**: quando o produto tiver `variations`, a escolha vira obrigatória antes do
  pedido; sem variações, nada muda na tela.
- **Compartilhar**: Web Share API onde existe, cópia do link como alternativa, com aviso visível
  do resultado.
- **Avaliação em estrelas** no card e na página, a partir de `averageRating`/`totalReviews`.
- **Ficha técnica** completa e **selos** de garantia, frete e suporte.
- **Busca por similaridade** no catálogo, alternável com a busca normal, exibindo o percentual
  de similaridade de cada resultado. Ela depende de `OPENAI_API_KEY` no backend e hoje responde
  500 sem a chave — a loja precisa **dizer isso** em vez de mostrar "nenhum resultado".
- **Filtros**: subcategoria e itens por página, além dos que já existem.

### O que deliberadamente NÃO vai ser portado

A home do institucional exibe três números — *"500+ produtos vendidos"*, *"1.2k+ clientes
satisfeitos"*, *"4.9 de avaliação média"*. Eles estão **escritos no código**, não vêm de lugar
nenhum. Num site institucional isso já é ruim; numa loja onde a pessoa decide comprar, é prova
social fabricada. Ficam de fora até existir de onde tirar o número de verdade.

**Fora de escopo:** carrinho e checkout (a API não tem), a tela de admin de produtos (segue no
institucional) e cálculo real de frete — o CEP entra na mensagem do WhatsApp, quem calcula é o
atendente, como já é hoje.

## Capabilities

### Modified Capabilities
- `mart-storefront`: a loja passa a ter caminho de pedido, escolha de variação, compartilhamento
  e busca por similaridade — deixando de ser só navegação.

## Impact

- **`web/src/pages/ProductPage.tsx`**: a maior mudança — pedido, variações, compartilhamento,
  ficha e selos.
- **`web/src/pages/CatalogPage.tsx`**: filtros adicionais e alternância de modo de busca.
- **`web/src/lib/whatsapp.ts`** (novo) e **`web/src/lib/api.ts`**: montagem da mensagem e a
  chamada de similaridade.
- **`web/.env.example`**: `VITE_WHATSAPP_NUMBER`.
- **Sem mudança no backend** — tudo que a loja precisa já está exposto.
- **Atenção**: `/products/search/similar` tem teto de 10 chamadas/min por IP (change
  `secure-catalog-write-endpoints`). A loja deve tratar `429` como "aguarde", não como erro
  genérico.
