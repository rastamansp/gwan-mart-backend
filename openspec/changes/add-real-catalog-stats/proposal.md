# Proposal — add-real-catalog-stats

## Why

A home do `/gwan-mart` no site institucional mostra três números — *"500+ produtos vendidos"*,
*"1.2k+ clientes satisfeitos"*, *"4.9 de avaliação média"*. Eles estão escritos no código
(`GwanMartPage.tsx`, constante `stats`); não vêm de venda, de cliente nem de avaliação nenhuma.

Na change `port-storefront-features` eles ficaram deliberadamente de fora da loja nova: prova
social inventada, numa página onde a pessoa decide gastar dinheiro, é enganosa — e o risco não é
só ético, é de credibilidade quando alguém pergunta ao atendente sobre "os 1.2k clientes".

Mas a seção em si tem valor: dá escala e ajuda a entender o catálogo antes de entrar nele. Este
change traz a seção de volta **com números que a API sustenta**.

## What Changes

- **Três indicadores derivados do catálogo real** (`GET /products/all`, a mesma chamada que já
  alimenta os filtros — sem requisição nova):
  - **produtos disponíveis**: itens ativos com estoque;
  - **categorias**: quantas categorias distintas o catálogo tem;
  - **avaliação média**: média ponderada pelo número de avaliações, com o total de avaliações
    ao lado — ponderada porque um produto com 3 avaliações não pode pesar o mesmo que um com
    234.
- **Cada indicador só aparece se tiver base**: catálogo sem nenhuma avaliação não mostra nota;
  falha ao carregar não mostra a seção. Nunca um número de enfeite.
- **Nada é inventado**: se a API não sustenta a métrica (vendas, clientes), ela não existe na
  tela.

**Fora de escopo:** métricas que exigiriam dado que a API não tem — volume de vendas, clientes
atendidos, prazo de entrega. Elas voltam quando houver de onde tirar.

## Capabilities

### Modified Capabilities
- `mart-storefront`: a home passa a resumir o catálogo com números verificáveis.

## Impact

- **`web/src/pages/HomePage.tsx`**: nova seção de indicadores.
- **`web/src/lib/api.ts`**: função que calcula os indicadores a partir da lista de produtos —
  pura, sem chamada nova.
- **Sem mudança no backend.**
- **Custo**: a home passa a fazer também a chamada de catálogo completo. Com o catálogo atual
  (5 produtos) é irrelevante; se o catálogo crescer muito, o caminho é um endpoint de resumo na
  API — anotado como limite conhecido, não resolvido agora.
