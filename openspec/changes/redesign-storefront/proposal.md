# Proposal — redesign-storefront

## Why

A loja (`mart.gwan.cloud`) funciona, mas não tem cara. A paleta é a `zinc` padrão do Tailwind com
um âmbar de ação, a fonte é a do sistema e o hero é um bloco escuro só com texto. Nada ali diz
"Gwan Mart" — a mesma página poderia ser de qualquer loja feita com o mesmo template.

E o visitante chega quase sempre **pelo celular, a partir de um link de produto colado no
WhatsApp**: a primeira tela que ele vê é a de produto, em 390 px de largura. Medido na loja atual
(`integ/onda-1`, Chrome headless a 390×844, API de dev com o catálogo do seed):

| Achado | Medida |
|---|---|
| **O botão "Pedir pelo WhatsApp" está abaixo da dobra** | topo em y=1108 num produto sem variação e y=1362 num produto com variação — a tela tem 844 |
| **O botão flutuante do assistente cobre o preço** | preço em y 767–803, botão em y 772–820, ambos na largura toda; no produto, a coisa mais importante da página fica por baixo dele |
| **O mesmo botão cobre o "Tentar de novo"** no estado de erro da home | ver `assets/atual-mobile-home-erro.jpg` |
| **O hero ocupa ~460 px antes do primeiro produto** | e não mostra produto nenhum |
| **No catálogo, os produtos começam em y≈343** | três linhas de `select` antes da grade |
| **Preço riscado ilegível** | `zinc-400` sobre branco = 2,56:1 (AA exige 4,5:1) |
| **Botão "Escolha uma opção para pedir" ilegível** | branco sobre `zinc-300` = 1,48:1 |
| **Cores de estado improvisadas por tela** | erro é vermelho na home e âmbar no catálogo; o CTA é `emerald-600` solto, sem token |
| **Mensagem de erro fala com o desenvolvedor** | "A loja depende da API do Mart… verifique se ela está no ar", mostrada ao comprador |
| **Card repete "ELETRÔNICOS" em todos os itens** e não diz nada sobre estoque até ele zerar | a hierarquia do card é categoria → nome → estrelas → preço, com o preço por último |

Capturas em `assets/` (todas `atual-*`).

Issue: [#11](https://github.com/rastamansp/gwan-mart-backend/issues/11).

## What Changes

- **Direção visual própria**, escolhida pelo mantenedor entre as três propostas em `design.md`
  (paleta com contraste AA verificado, par tipográfico, tratamento do hero).
- **Tokens de design** como variáveis CSS mapeadas no `theme` do Tailwind, com nomes de função
  (`ink`, `surface`, `primary`, `price`, `danger`…) no lugar de `zinc-*`/`brand-*`/`red-*`
  espalhados pelas telas. Trocar a direção depois é trocar tokens, não reescrever classes.
- **Componentes base** reescritos sobre os tokens: botão, card de produto, selo de desconto,
  linha de estoque, avaliação, estados (carregando/vazio/erro), barra de ação fixa.
- **Card de produto com hierarquia de compra**: imagem → nome → preço (grande) com preço antigo e
  desconto → avaliação compacta → estoque ("últimas N unidades", "sem estoque").
- **Página de produto mobile-first**: galeria deslizável, variações como opções tocáveis, e uma
  **barra de pedido fixa** no rodapé com preço e "Pedir pelo WhatsApp", visível sem rolar.
- **Assistente sem cobrir conteúdo**: o botão flutuante sai; o assistente passa a ser aberto pelo
  cabeçalho (e pela barra de pedido, na página de produto). Nenhum elemento fixo pode cobrir
  preço, CTA ou botão de nova tentativa.
- **Estados coerentes** em todas as telas, com texto para o comprador (não para quem opera a
  API) e um caminho de saída em cada um.
- **Catálogo**: filtros recolhidos num botão "Filtros" no mobile, com os filtros ativos visíveis
  como chips; a grade começa logo abaixo da busca.
- **Ícones e prévia de link (#10) regenerados** na nova paleta, **com os mesmos nomes de
  arquivo**, para o `index.html`, o SSI e o `theme-color` não mudarem de contrato.
- **Gate de revisão visual**: tokens, componentes base e a página de produto são aplicados
  primeiro; o mantenedor aprova com capturas antes de o resto das telas ser migrado.

**Fora de escopo**: dark mode (decisão em `design.md`), carrinho/checkout, mudança de API,
mudança de rota ou de conteúdo do SEO, ilustração encomendada (o hero usa produto real), e o
painel admin (`web/src/pages/admin/`, de outra change), que só recebe os tokens se já existir
quando esta for aplicada.

## Capabilities

### Modified Capabilities
- `mart-storefront`: a loja passa a ter identidade visual própria, card e página de produto com
  hierarquia de compra, pedido visível sem rolar no mobile e estados uniformes.

## Impact

- **`web/`**: `tailwind.config.js`, `src/index.css`, `index.html` (fontes, `theme-color`),
  componentes em `src/components/`, as três páginas e o `App.tsx` (cabeçalho, rodapé, abertura do
  assistente). `public/` e `brand/` com ícones e `og-default.png` regenerados.
- **Dependência nova**: as fontes, servidas pela própria loja (pacotes `@fontsource-variable/*`),
  ou pelo Google Fonts — decisão em `design.md`.
- **API**: nenhuma mudança. Tudo que o card e a página usam já vem em `Product` (preço
  promocional, desconto, avaliação, estoque, imagens, variações).
- **Sem infraestrutura nova.** Nenhum container, rota de nginx ou env nova.
- **Risco**: regressão visual nas telas que a change não revisar com captura; mitigado pelo gate
  e por um roteiro de capturas a 390×844 e 1280×800 versionado junto (tarefa 1.4).
