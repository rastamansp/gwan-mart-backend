# Tasks — redesign-storefront

> Nada aqui começa antes da **escolha da direção** (pendência 1 do `design.md`). As fases 1–4
> produzem o que o mantenedor revisa no gate da fase 5; as telas restantes só migram depois dele.

## 0. Decisões do mantenedor

- [ ] 0.1 Direção escolhida (A "Etiqueta", B "Conversa" ou C "Vitrine") registrada no topo do `design.md`
- [ ] 0.2 Selos "Garantia / Frete grátis / Suporte": confirmados como política real (viram constante única) ou removidos
- [ ] 0.3 Limite de "últimas unidades" e origem das fontes (loja ou Google Fonts)

## 1. Base de verificação

- [ ] 1.1 Capturas "antes" já em `assets/atual-*` (390×844 e 1280×800); conferir se continuam valendo na base atual da branch
- [ ] 1.2 Roteiro de captura reproduzível (home, catálogo, catálogo vazio, produto com e sem variação, produto inexistente, erro com a API bloqueada, carregando), nas duas larguras
- [ ] 1.3 Medição de sobreposição a 390×844 (preço × CTA × assistente × "Tentar de novo"), pelo mesmo método do diagnóstico (`getBoundingClientRect`)
- [ ] 1.4 Documentar o roteiro no `web/README.md` (como rodar, sem dependência nova no `package.json` se der)

## 2. Tokens

- [ ] 2.1 Variáveis CSS da direção em `src/index.css` (canais RGB) e mapeamento semântico no `tailwind.config.js`; `brand` mantida só até a fase 6
- [ ] 2.2 Fontes: instalar e importar só o subconjunto latin, `font-display: swap`, pilha de reserva; medir o total no build contra o orçamento (~100 KB)
- [ ] 2.3 Tabela de contraste dos tokens recalculada e colada no `design.md` (se algum hex mudar na implementação)

## 3. Componentes base

- [ ] 3.1 Botão (primário, secundário, pedido) com alvo ≥ 44 px e foco visível
- [ ] 3.2 `ProductCard` na nova hierarquia: preço → riscado + `-N%` → avaliação compacta → estoque; categoria fora do card
- [ ] 3.3 Linha de estoque (sem estoque / últimas N / nada) como função pura com teste
- [ ] 3.4 `States`: carregando com forma do conteúdo e sem animação em `prefers-reduced-motion`; vazio com ação; erro com texto para o comprador, nova tentativa e saída por WhatsApp
- [ ] 3.5 Cabeçalho com acesso ao assistente; remoção do botão flutuante; painel do assistente como folha no mobile

## 4. Página de produto (a tela que mais importa)

- [ ] 4.1 Galeria com `scroll-snap`, indicador de posição, miniaturas no desktop
- [ ] 4.2 Variações como opções tocáveis; indisponível identificada e não escolhível
- [ ] 4.3 Barra de pedido fixa no mobile (preço + pedido + atalho do assistente), com `safe-area` e `padding-bottom` na página
- [ ] 4.4 Variação pendente: a ação leva às opções e foca o grupo, em vez de botão desabilitado
- [ ] 4.5 Coluna de compra `sticky` no desktop

## 5. ⛔ Gate de revisão visual do mantenedor

- [ ] 5.1 Capturas "depois" (roteiro 1.2) de tokens, card, estados e página de produto, lado a lado com as "antes"
- [ ] 5.2 Medição 1.3 sem nenhuma sobreposição; CTA visível sem rolar com e sem variação
- [ ] 5.3 **Aprovação do mantenedor registrada** (comentário na issue #11 ou nota no `design.md`). Ajustes pedidos voltam às fases 2–4 antes de seguir

## 6. Demais telas (só depois do gate)

- [ ] 6.1 Home: hero da direção (com o destaque real; sem destaque, hero sem foto), indicadores e categorias
- [ ] 6.2 Catálogo: botão "Filtros" com folha no mobile, chips removíveis, grade logo abaixo da busca; busca por similaridade nos tokens
- [ ] 6.3 "Não encontrada" e "produto não encontrado" nos estados novos
- [ ] 6.4 Chat (`ChatPanel`, `ChatMarkdown`) nos tokens
- [ ] 6.5 Remover a escala `brand` e conferir que não sobra classe de paleta crua em `web/src` (exceto `pages/admin/`, se for de outra change)

## 7. Ícones e prévia (#10)

- [ ] 7.1 Redesenhar `brand/og-default.svg` e `public/favicon.svg` na direção; decidir rasterização com a fonte instalada ou texto em curva
- [ ] 7.2 Regenerar `favicon-32.png`, `apple-touch-icon.png` e `og-default.png` **com os mesmos nomes**
- [ ] 7.3 `theme-color` do `index.html` na cor do cabeçalho; `curl` de `/` e de `/product/:code` na imagem de produção confirma meta e caminhos inalterados

## 8. Validação final

- [ ] 8.1 `npm run lint` e `npm run build` em `web/`
- [ ] 8.2 Roteiro de capturas completo nas duas larguras, mais 360 px sem rolagem horizontal
- [ ] 8.3 Teclado: foco visível em toda ação; leitor de tela anuncia preço, desconto e estoque do card
- [ ] 8.4 Pós-deploy (não dá para conferir localmente): prévia real colando um link no WhatsApp
