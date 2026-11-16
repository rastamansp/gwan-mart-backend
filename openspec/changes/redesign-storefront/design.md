# Design — redesign-storefront

## Contexto

A loja é uma SPA React 18 + Vite + Tailwind 3 em `web/`, servida por nginx na mesma stack da API.
Hoje o visual vem de três lugares:

- `tailwind.config.js`: só uma escala `brand` (âmbar, 50/100/500/600/700);
- `src/index.css`: `bg-zinc-50 text-zinc-900`, nada mais;
- classes de paleta crua direto nos componentes — `zinc-*`, `brand-*`, `red-*`, `amber-*`,
  `emerald-*` —, sem nome de função. O "erro" é vermelho na home e âmbar no catálogo, porque cada
  tela escolheu o seu.

Não há fonte web (a pilha `sans` padrão do Tailwind), nem ilustração, nem foto no hero. Os ícones
e a imagem de prévia da #10 (`public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`,
`og-default.png`, fonte em `brand/og-default.svg`) usam o âmbar `#f59e0b` sobre `#18181b`, e o
`index.html` declara `theme-color` `#18181b`.

O público chega pelo celular a partir de um link de produto no WhatsApp. **A tela que mais importa
é a página de produto a 390 px**, e é nela que a loja atual mais falha (ver `proposal.md`: CTA em
y=1108/1362 numa tela de 844, botão do assistente em cima do preço).

O que a API já entrega e o redesenho pode usar, sem mudar nada no backend: preço original e
promocional, percentual de desconto, nota média e total de avaliações, estoque, até N imagens
ordenadas, variações (`nome`, `cor`, `disponivel`), destaques e o resumo `/products/stats`
(disponíveis, categorias, avaliação média).

## O que vale para qualquer direção

Estas decisões não dependem da escolha estética e são o que o delta de spec verifica.

### Página de produto no mobile

```
┌──────────────────────────────────────┐
│ ◧ Gwan Mart            [Assistente]  │  cabeçalho fino (56 px)
├──────────────────────────────────────┤
│                                      │
│            foto 1 de 3               │  galeria deslizável
│                                      │  (scroll-snap, sem lib)
│              • ○ ○                   │
├──────────────────────────────────────┤
│ Tablet Ultra HD 10.5"                │
│ ★ 4,4 · 178 avaliações               │
│ R$ 1.999,99  -10%                    │  preço antigo + desconto
│ R$ 1.799,99                          │  preço grande
│ Últimas 9 unidades                   │
│ ( 256GB Preto ) ( 256GB Azul ) (⊘)   │  variações tocáveis
│ ...descrição, ficha técnica...       │
├──────────────────────────────────────┤
│ R$ 1.799,99  [ ◉ Pedir no WhatsApp ] │  BARRA FIXA — sempre visível
└──────────────────────────────────────┘
```

- **Barra de pedido fixa no rodapé** (só na página de produto, só abaixo de `md`), com o preço
  efetivo e o botão de pedido. Respeita `env(safe-area-inset-bottom)` e a página ganha
  `padding-bottom` igual à altura da barra, para nada ficar escondido atrás dela.
- **Variação pendente não vira botão cinza desabilitado.** O botão diz "Escolher opção" e, ao
  toque, rola até as variações e põe foco no grupo. Hoje é branco sobre `zinc-300` (1,48:1).
- **Quantidade, origem do frete e CEP** continuam na página (o pedido precisa deles), abaixo das
  variações; a barra usa os valores escolhidos.
- No desktop a coluna da direita fica `sticky`, e a barra não existe.

### O assistente não flutua mais sobre o conteúdo

O botão "Falar com o assistente" fixo no canto cobre o preço do produto, o conteúdo dos cards e o
"Tentar de novo" do estado de erro. Ele sai. O assistente passa a abrir:

- por um botão **no cabeçalho**, em todas as telas;
- por um ícone secundário **na barra de pedido**, na página de produto;
- pelas **sugestões do hero** (o que for a direção escolhida).

No mobile o painel abre como folha de baixo para cima, largura total. Regra verificável: **a
390×844, nenhum elemento fixo se sobrepõe ao preço, ao CTA de pedido ou a um botão de nova
tentativa** (comparação de `getBoundingClientRect`, o mesmo método usado no diagnóstico).

### Card de produto

Ordem de leitura: **imagem → nome → preço → avaliação → estoque**.

- Preço efetivo grande; preço antigo riscado e o `-N%` ao lado quando há promoção. O riscado usa
  o token `ink-muted` (≥ 4,5:1), não um cinza claro.
- Avaliação compacta numa linha (`★ 4,5 · 289`). Sem avaliação, a linha some (regra que já existe
  em `Rating`).
- Estoque: `stock <= 0` → "Sem estoque", imagem dessaturada, card continua navegável;
  `1..LIMITE` → "Últimas N unidades"; acima disso, nada (não poluir o card com "em estoque").
  `LIMITE` default 5, constante única (pergunta ao mantenedor).
- A categoria sai do card: em todo o catálogo de seed ela é "ELETRÔNICOS" em todos os itens. Ela
  continua no filtro e no breadcrumb.
- Alvo de toque ≥ 44 px em tudo que é clicável fora do card.

### Estados

Um componente por estado, usado em todas as telas, com o mesmo formato do conteúdo que substitui:

- **Carregando**: esqueleto com a forma do card/página (já existe; passa para tokens). Respeita
  `prefers-reduced-motion` (sem `animate-pulse`).
- **Vazio**: título + dica + **uma ação** ("Limpar filtros", "Ver o catálogo").
- **Erro**: texto para o comprador ("Não conseguimos carregar os produtos agora."), botão "Tentar
  de novo" e, quando o número estiver configurado, "Falar no WhatsApp" como saída. A frase sobre
  "a API do Mart" sai da tela (vai para `console.error`, onde ajuda quem opera).
- Erro e aviso usam **os mesmos tokens** em todas as telas (`danger`, `warning`).

### Catálogo no mobile

Busca no topo; categoria, subcategoria e itens por página recolhidos num botão **"Filtros"** que
abre uma folha; filtros ativos aparecem como chips removíveis acima da grade. A grade começa logo
abaixo da busca (hoje começa em y≈343).

## As três direções

Todas com contraste calculado pela fórmula da WCAG 2.1 (luminância relativa), para texto
normal (AA ≥ 4,5:1) — os valores estão ao lado de cada par. Nenhuma usa marca, logotipo, fonte
proprietária ou combinação de cores reconhecível de loja existente.

### Direção A — "Etiqueta"

Mercado de bairro com etiqueta de preço: papel quente, terracota e mostarda. O preço é o herói,
em etiqueta.

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `bg` | `#FBF6EE` | fundo (papel) | — |
| `surface` | `#FFFFFF` | card | — |
| `surface-alt` | `#F2EADB` | faixas, chips | — |
| `ink` | `#221C17` | texto | 15,66 sobre `bg` |
| `ink-muted` | `#6B5E52` | texto secundário, preço riscado | 5,83 / `bg` · 6,27 / `surface` · 5,25 / `surface-alt` |
| `primary` | `#B03A1E` | botões, links | branco sobre ele 6,05 · como texto sobre `bg` 5,63 |
| `primary-hover` | `#8F2E17` | | branco 8,17 |
| `price` | `#B03A1E` | preço | 6,05 / `surface` |
| `tag` | `#F2B53A` | etiqueta de desconto | `ink` sobre ela 9,18 |
| `order` | `#13704A` | pedido no WhatsApp | branco 6,10 |
| `danger` | `#B42318` | erro | 6,57 / branco |
| `warning` / `warning-bg` | `#7A4B00` / `#FDF1D6` | aviso | 6,61 |

⚠️ `primary` sobre `tag` dá 3,30 — **não** pôr texto terracota na etiqueta; o texto da etiqueta é
sempre `ink`.

**Tipografia**: **Bricolage Grotesque** (títulos, 700–800; tem eixo de largura e tamanho óptico,
dá a voz "cartaz") + **Figtree** (texto, 400/600). Duas famílias variáveis.

**Hero**: foto do **primeiro produto em destaque** (dado real de `/products/featured`), recortada
num cartão com uma etiqueta de preço inclinada em CSS mostrando o preço de verdade. Sem destaque,
cai num hero só de texto, sem foto inventada.

```
Home (390)                            Card (2 colunas)
┌──────────────────────────────────┐  ┌─────────────────┐
│ ◧ Gwan Mart        [Assistente]  │  │╭───────╮        │
├──────────────────────────────────┤  ││ -17%  │ foto   │  etiqueta mostarda
│ Tecnologia boa,                  │  │╰───────╯        │
│ preço na etiqueta.               │  │                 │
│ ┌──────────────────┐             │  ├─────────────────┤
│ │   foto produto   │╲ R$ 749 ╲   │  │ Smartwatch      │
│ │   em destaque    │ ╲───────╲   │  │ Fitness Pro     │
│ └──────────────────┘             │  │ R$ 899,99       │  riscado, ink-muted
│ [Ver o catálogo] [WhatsApp]      │  │ R$ 749,99       │  terracota, grande
├──────────────────────────────────┤  │ ★ 4,5 · 289     │
│ 5 produtos · 1 categoria · ★4,6  │  │ Últimas 3 un.   │
│ Destaques            Ver todos → │  └─────────────────┘
│ [card] [card]                    │
└──────────────────────────────────┘
```

**A favor**: a mais calorosa e a mais distante do "template de Tailwind"; o preço vira a marca.
**Contra**: é a que mais dá trabalho de CSS (etiqueta inclinada, recortes) e a estética de feira
pode destoar de um catálogo de eletrônicos de ticket alto (um notebook de R$ 6.299 numa etiqueta
de feira).

### Direção B — "Conversa" (recomendada)

A loja é uma conversa: a única forma de comprar é falar com alguém (WhatsApp) ou com o
assistente. Verde-azulado profundo, fundo de menta clara, coral para desconto.

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `bg` | `#F3F7F6` | fundo | — |
| `surface` | `#FFFFFF` | card | — |
| `bubble` | `#D7F0EA` | bolhas de sugestão, chips, destaque suave | `ink` 12,50 · `ink-muted` 5,10 |
| `ink` | `#0D2B2F` | texto; também fundo do cabeçalho do hero | 13,85 / `bg`; branco sobre ele 14,96 |
| `ink-muted` | `#4F6669` | texto secundário, preço riscado | 5,66 / `bg` · 6,11 / `surface` |
| `primary` | `#0B6E66` | botões, links, **pedido no WhatsApp** | branco 6,11 · como texto 6,11 |
| `primary-hover` | `#08564F` | | branco 8,56 |
| `price` | `#0D2B2F` | preço (é o `ink`, em peso 700) | 13,85 |
| `deal` | `#C2412A` | selo de desconto, `-N%` | branco sobre ele 5,14 · como texto 5,14 |
| `danger` | `#B42318` | erro | 6,57 |
| `warning` / `warning-bg` | `#7A4B00` / `#FDF1D6` | aviso | 6,61 |

O pedido usa o próprio `primary`, com o ícone de conversa: **não** o verde do WhatsApp
(`#25D366`), que com texto branco dá 1,98:1 e reproduziria a marca de terceiro. O ícone e o rótulo
"Pedir no WhatsApp" já dizem para onde o botão leva.

**Tipografia**: **Sora** (títulos, 600/700, geométrica e com personalidade nos números — preço
fica bonito nela) + **Plus Jakarta Sans** (texto, 400/600, ótima em 14–16 px no celular). Duas
famílias variáveis.

**Hero**: fundo `ink`, título curto, e **sugestões tocáveis em forma de bolha** ("Fone bluetooth
até R$ 400?", "Qual notebook para jogos?") que **abrem o assistente com a pergunta preenchida**
(o `ChatPanel` já tem sugestões; o hero só as traz para fora). Ao lado, um card do primeiro
destaque real. **Nada de conversa encenada**: as bolhas são perguntas que o visitante pode fazer,
não falas atribuídas ao bot. Sem destaque, as bolhas sozinhas.

```
Home (390)                            Card (2 colunas)
┌──────────────────────────────────┐  ┌─────────────────┐
│ ◧ Gwan Mart        [Assistente]  │  │ ▣ -17%   foto   │  selo coral
├──────────────────────────────────┤  │                 │
│▓ Pergunte. A gente acha.        ▓│  ├─────────────────┤
│▓ O assistente consulta o        ▓│  │ Smartwatch      │
│▓ estoque real agora.            ▓│  │ Fitness Pro     │
│▓ (Fone bluetooth até R$ 400?)   ▓│  │ R$ 749,99       │  ink 700, grande
│▓ (Qual notebook para jogos?)    ▓│  │ R$ 899,99 -17%  │  riscado + coral
│▓ [Ver o catálogo]               ▓│  │ ★ 4,5 · 289     │
├──────────────────────────────────┤  │ Últimas 3 un.   │
│ 5 produtos · 1 categoria · ★4,6  │  └─────────────────┘
│ Destaques            Ver todos → │
│ [card] [card]                    │
└──────────────────────────────────┘
```

**Por que é a recomendada**:

1. **Diz o que a loja faz de diferente.** Não há carrinho; o pedido fecha na conversa, e o
   assistente consulta estoque de verdade. A identidade reforça o único caminho de compra que
   existe, em vez de imitar um e-commerce com checkout que a loja não tem.
2. **Resolve o assistente por design**, não por remendo: a conversa vira linguagem visual (bolhas,
   chips), e o botão flutuante que cobre o preço deixa de ter razão de existir.
3. **Contraste com folga** em todos os pares de texto (mínimo 5,10), inclusive no selo de
   desconto, que hoje está em 3,19.
4. **O hero mostra produto e ação sem foto encomendada**, e continua honesto com catálogo vazio.
5. **Combina com quem chega**: o visitante acabou de sair de uma conversa no WhatsApp; a loja
   continua a mesma conversa.

**Contra**: a mais "calma" das três — se o mantenedor quer uma loja de ofertas gritante, a A ou a
C servem melhor. E o hero depende de o assistente estar no ar: com a API do chat fora, as bolhas
abrem o painel no estado de erro (que já existe).

### Direção C — "Vitrine"

Editorial e de alto contraste: branco, preto, um azul-cobalto de ação e um lima para oferta. A
foto do produto manda.

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `bg` | `#FFFFFF` | fundo | — |
| `surface-alt` | `#F2F2EF` | faixas, fundo de foto | — |
| `ink` | `#111111` | texto, preço, **pedido** | 18,88 |
| `ink-muted` | `#5C5C5C` | texto secundário, riscado | 6,69 / `bg` · 5,96 / `surface-alt` |
| `primary` | `#2D3FE0` | links, botões secundários | branco 7,24 · como texto 7,24 |
| `primary-hover` | `#2232B8` | | branco 9,47 |
| `deal` | `#D7F75B` | selo de oferta | `ink` sobre ele 15,60 |
| `order` | `#111111` | pedido no WhatsApp (botão preto) | branco 18,88 |
| `danger` | `#B42318` | erro | 6,57 |
| `warning` / `warning-bg` | `#7A4B00` / `#FDF1D6` | aviso | 6,61 |

**Tipografia**: **Archivo** nas duas funções — títulos em largura expandida (`wdth` 112–125,
800) e texto em largura normal (400/600). Um par tipográfico saído de **uma família**, a opção
mais leve das três (a confirmar: o eixo `wdth` pode exigir o arquivo "full" do pacote, maior que
o só-`wght`; medir na tarefa 2.2).

**Hero**: o primeiro destaque em **foto sangrada** (largura toda no mobile), com nome e preço em
tipografia grande sobre faixa branca. Sem destaque, cai num bloco tipográfico.

```
Home (390)                            Card (2 colunas)
┌──────────────────────────────────┐  ┌─────────────────┐
│ GWAN MART          [Assistente]  │  │                 │
├──────────────────────────────────┤  │   foto grande   │
│                                  │  │      ▮OFERTA▮   │  selo lima
│     FOTO DO PRODUTO SANGRADA     │  ├─────────────────┤
│                                  │  │ SMARTWATCH      │  Archivo expandida
├──────────────────────────────────┤  │ FITNESS PRO     │
│ SMARTWATCH FITNESS PRO           │  │ R$ 749,99       │
│ R$ 749,99   ▮-17%▮               │  │ R$ 899,99       │
│ [■ Ver produto] Ver catálogo →   │  │ ★ 4,5 · 289     │
├──────────────────────────────────┤  └─────────────────┘
│ Destaques                        │
└──────────────────────────────────┘
```

**A favor**: a de leitura mais rápida, ótima com boas fotos; menor custo de fonte.
**Contra**: depende da qualidade das fotos do fornecedor (foto ruim fica enorme); a estética
"preto + cor elétrica" é a mais próxima do genérico de loja de tecnologia, ou seja, a que menos
cumpre o "identidade própria" da issue. E o lima não pode carregar texto branco.

## Decisões técnicas

### Tokens: variáveis CSS + `theme` do Tailwind

- Os valores vivem em `src/index.css`, em `:root`, como canais RGB (`--c-primary: 11 110 102;`),
  e o `tailwind.config.js` os expõe com nome de função:
  `primary: 'rgb(var(--c-primary) / <alpha-value>)'`. Isso mantém os modificadores de opacidade
  do Tailwind (`bg-primary/10`) e deixa a troca de direção — ou um dark mode futuro — restrita a
  um bloco de variáveis.
- Conjunto mínimo: `bg`, `surface`, `surface-alt`, `line`, `ink`, `ink-muted`, `primary`,
  `primary-hover`, `on-primary`, `price`, `deal`, `order`, `danger`, `warning`, `warning-bg`,
  `success`. Mais `radius-card`, `radius-control`, `shadow-card` e `fontFamily.display`/`sans`.
- **A escala `brand` sai**, e as classes de paleta crua (`zinc-*`, `brand-*`, `red-*`, `amber-*`,
  `emerald-*`) deixam de aparecer em `web/src` — verificável por busca no código (tarefa 5.3).
  Exceção: `web/src/pages/admin/` (de outra change), migrado só se já estiver na base quando esta
  for aplicada.

### Fontes: servidas pela própria loja

As três direções usam famílias do Google Fonts, **mas servidas pela loja** pelos pacotes
`@fontsource-variable/*` (mesmos arquivos, licença OFL), importados no `main.tsx`:

- **Sem conexão a terceiro no 4G**: Google Fonts custa DNS + TLS em dois domínios
  (`fonts.googleapis.com` e `fonts.gstatic.com`) antes do primeiro texto, no exato cenário de
  quem abre um link do WhatsApp no celular.
- **Funciona na rede local** (`edf475f`, acesso pela LAN) e sem internet no dev.
- Arquivos com hash no nome, cacheados pelo nginx como o resto dos assets.
- Só o subconjunto **latin** (o pacote separa por `unicode-range`; o navegador só baixa o que a
  página usa), `font-display: swap`, e fallback de sistema na pilha.
- **Orçamento: até ~100 KB de fonte no primeiro carregamento**, medido no build (tarefa 2.2). Os
  números exatos por família não foram medidos nesta proposta.

Alternativa aceitável, se o mantenedor preferir não ter dependência: `<link>` do Google Fonts com
`preconnect` e `display=swap`. Fica mais lento no primeiro acesso e é a única requisição a
terceiro da loja.

### Dark mode: não, nesta change

- O visitante chega por link e fica minutos; não há sessão longa que justifique o custo.
- As fotos de produto do catálogo são, em boa parte, **fundo branco** de fornecedor — num tema
  escuro viram retângulos brancos estourados.
- Dobra a matriz de revisão visual (e de contraste) no momento em que a identidade ainda está
  sendo decidida.
- O custo de adicionar depois é baixo **porque os tokens são variáveis CSS**: basta um bloco
  `@media (prefers-color-scheme: dark)` redefinindo-os. `color-scheme: light` continua declarado.

### Ícones e prévia de link (#10)

- `brand/og-default.svg` e `public/favicon.svg` são redesenhados na paleta escolhida; os PNG
  (`favicon-32.png`, `apple-touch-icon.png`, `og-default.png`) são regenerados pelo mesmo
  procedimento do `web/README.md`.
- **Os nomes de arquivo não mudam**: o `index.html`, o bloco SSI e as meta `og:*` continuam
  apontando para os mesmos caminhos — a change não toca no contrato de SEO.
- O texto do `og-default.svg` hoje usa "DejaVu Sans" porque é a fonte que existe onde o PNG é
  gerado. Para usar a fonte de títulos da direção, o PNG precisa ser rasterizado **com a fonte
  instalada** (container com o `.ttf` da família) ou com o texto convertido em curva no SVG —
  decidir na tarefa 7.1; o PNG final é o que vale.
- `theme-color` do `index.html` passa à cor do cabeçalho da direção escolhida.
- **O WhatsApp guarda a prévia em cache**: links já compartilhados podem mostrar a imagem antiga
  por um tempo. Não há como invalidar do nosso lado (mesma ressalva da #10).

### Sem biblioteca de componentes nova

A galeria é `scroll-snap` em CSS com indicadores; a folha de filtros e a do assistente são um
`dialog` com transição CSS. Nenhuma dependência além das fontes.

## Pendências (perguntas ao mantenedor)

1. **Qual direção** (A, B ou C)? A tarefa 1.1 só começa com a escolha.
2. **"Garantia 12 meses · Frete grátis acima de R$ 199 · Suporte via WhatsApp"** está fixo no
   `ProductPage.tsx` e não vem da API. São políticas reais da loja? Se forem, passam a uma
   constante/env única e ganham destaque no redesenho; se não, **saem** — a spec da loja proíbe
   dado fabricado no cliente, e um selo de frete grátis inventado é promessa comercial.
3. **Limite de "últimas unidades"**: 5 serve?
4. **Fontes servidas pela loja ou pelo Google Fonts**? (Recomendado: pela loja.)
5. As sugestões do hero (direção B) podem ser fixas no front, ou devem vir das categorias reais de
   `/products/stats`? (Proposta: geradas das categorias, com duas fixas de reserva.)
