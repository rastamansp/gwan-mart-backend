## ADDED Requirements

### Requirement: Pedido por WhatsApp a partir do produto
A página de produto SHALL oferecer um caminho de pedido por WhatsApp que leve, na mensagem, o
produto identificado pelo seu código, a quantidade escolhida, a origem do frete e — quando
informados — o CEP de entrega e a variação selecionada. O número de destino SHALL vir de
configuração, e NÃO SHALL estar escrito no código.

#### Scenario: Pedido com os dados escolhidos
- **WHEN** o visitante ajusta quantidade e origem e aciona o pedido
- **THEN** o WhatsApp abre com uma mensagem que identifica o produto e reproduz os dados escolhidos

#### Scenario: Número de destino não configurado
- **WHEN** a loja é construída sem o número de contato configurado
- **THEN** a opção de pedido não é oferecida, em vez de abrir uma conversa para um número inválido

### Requirement: Escolha de variação antes do pedido
Quando o produto tiver variações, a página SHALL apresentá-las com nome, característica e
disponibilidade, e SHALL exigir uma escolha antes de permitir o pedido. Produto sem variações
NÃO SHALL exibir a seção nem exigir escolha.

#### Scenario: Produto com variações
- **WHEN** o visitante abre um produto que tem variações e tenta pedir sem escolher
- **THEN** o pedido não é enviado e a tela indica que falta escolher a opção

#### Scenario: Variação indisponível
- **WHEN** uma variação está marcada como indisponível
- **THEN** ela aparece identificada como tal e não pode ser escolhida para o pedido

### Requirement: Compartilhamento do produto
A página de produto SHALL permitir compartilhar o endereço do produto usando o compartilhamento
nativo quando disponível, e cópia do link como alternativa, informando ao visitante o resultado
da ação.

#### Scenario: Compartilhamento nativo indisponível
- **WHEN** o navegador não oferece compartilhamento nativo e o visitante aciona compartilhar
- **THEN** o link é copiado e a loja confirma a cópia

#### Scenario: Compartilhamento cancelado
- **WHEN** o visitante abre o compartilhamento nativo e desiste
- **THEN** nenhuma mensagem de erro é exibida

### Requirement: Busca por similaridade alternável
O catálogo SHALL permitir alternar entre a busca comum e a busca por similaridade, indicando o
modo ativo e, nos resultados desta, o grau de similaridade de cada produto.

#### Scenario: Busca por similaridade bem-sucedida
- **WHEN** o visitante ativa a busca por similaridade e consulta um termo
- **THEN** os produtos aparecem acompanhados do respectivo grau de similaridade

#### Scenario: Recurso de similaridade indisponível no servidor
- **WHEN** o servidor não consegue gerar a consulta por similaridade
- **THEN** a loja explica que a busca por similaridade está indisponível e mantém a busca comum utilizável

#### Scenario: Limite de uso atingido
- **WHEN** o servidor recusa a consulta por excesso de requisições
- **THEN** a loja orienta a aguardar antes de tentar de novo, em vez de relatar erro genérico

### Requirement: Ficha técnica e avaliação visíveis
A página de produto SHALL apresentar os dados de identificação que o comprador confere antes de
fechar — código, classificação fiscal, código de barras, estoque, fornecedor e disponibilidade —
e a avaliação SHALL ser mostrada de forma gráfica, acompanhada do número de avaliações.

#### Scenario: Produto com avaliação
- **WHEN** o produto tem nota e avaliações registradas
- **THEN** a nota aparece representada graficamente junto do total de avaliações

#### Scenario: Produto sem avaliação
- **WHEN** o produto não tem avaliações
- **THEN** a área de avaliação é omitida, sem exibir nota zerada

### Requirement: Filtros do catálogo alinhados ao que a API aceita
O catálogo SHALL permitir refinar por categoria e subcategoria e escolher quantos itens são
exibidos por página, mantendo esse estado no endereço da página.

#### Scenario: Refino por subcategoria
- **WHEN** o visitante filtra por uma subcategoria
- **THEN** apenas produtos daquela subcategoria são listados, e o endereço reflete o filtro

#### Scenario: Endereço compartilhado
- **WHEN** alguém abre um endereço de catálogo que já traz filtros
- **THEN** a listagem aparece com os filtros aplicados
