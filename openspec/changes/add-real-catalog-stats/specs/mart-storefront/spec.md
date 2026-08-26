## ADDED Requirements

### Requirement: Indicadores da home derivados do catálogo
A home SHALL apresentar indicadores do catálogo calculados a partir dos dados que a API
fornece. NÃO SHALL exibir número que não venha dos dados — em particular, métricas de venda ou
de clientes que a API não expõe.

#### Scenario: Catálogo com produtos
- **WHEN** a home é aberta e a API devolve o catálogo
- **THEN** os indicadores refletem a contagem real de produtos disponíveis e de categorias

#### Scenario: Falha ao carregar o catálogo
- **WHEN** a chamada que alimenta os indicadores falha
- **THEN** a seção de indicadores é omitida e o restante da home continua funcionando

### Requirement: Avaliação média ponderada e condicional
A avaliação média exibida SHALL ser ponderada pelo número de avaliações de cada produto e SHALL
vir acompanhada do total de avaliações consideradas. Se nenhum produto tiver avaliação, o
indicador NÃO SHALL ser exibido.

#### Scenario: Produtos com volumes diferentes de avaliação
- **WHEN** um produto muito avaliado e outro pouco avaliado têm notas distintas
- **THEN** a média exibida se aproxima mais da nota do produto com mais avaliações

#### Scenario: Catálogo sem avaliações
- **WHEN** nenhum produto do catálogo tem avaliação registrada
- **THEN** o indicador de avaliação não aparece, em vez de exibir nota zerada
