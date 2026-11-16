## ADDED Requirements

### Requirement: Identidade visual por tokens
A loja SHALL definir cores, raios, sombras e famílias tipográficas como tokens com nome de função
(texto, superfície, ação, preço, oferta, erro, aviso), aplicados por todas as telas da vitrine.
As telas da vitrine NÃO SHALL usar diretamente as escalas de cor genéricas do framework de
estilo. Todo par de texto sobre fundo definido pelos tokens SHALL ter contraste de pelo menos
4,5:1.

#### Scenario: Cor fora dos tokens
- **WHEN** o código das telas da vitrine é inspecionado
- **THEN** nenhuma classe de cor usa as escalas genéricas do framework (cinza, âmbar, vermelho, verde), apenas os tokens da loja

#### Scenario: Preço riscado legível
- **WHEN** um produto em promoção exibe o preço antigo riscado
- **THEN** o preço antigo tem contraste de pelo menos 4,5:1 com o fundo do card

#### Scenario: Troca de tema concentrada
- **WHEN** a paleta da loja precisa mudar
- **THEN** a mudança se restringe à definição dos tokens, sem editar as telas

### Requirement: Fontes servidas sem atrasar o texto
A loja SHALL carregar as fontes da sua identidade com exibição imediata do texto em fonte de
reserva enquanto a fonte própria não chega, e o total de fonte baixado no primeiro carregamento
SHALL ficar dentro do orçamento definido no design.

#### Scenario: Rede lenta no celular
- **WHEN** a página é aberta numa conexão lenta e a fonte ainda não chegou
- **THEN** o texto já aparece legível na fonte de reserva, e não em branco

### Requirement: Card de produto com hierarquia de compra
O card de produto SHALL apresentar, nesta ordem de leitura, imagem, nome, preço efetivo,
avaliação e situação de estoque. Em promoção, SHALL exibir também o preço antigo e o percentual de
desconto. Com estoque igual ou abaixo do limite de "últimas unidades", SHALL informar a
quantidade restante; sem estoque, SHALL informar a indisponibilidade e continuar levando à página
do produto. Sem avaliação, a avaliação SHALL ser omitida.

#### Scenario: Produto em promoção
- **WHEN** o card mostra um produto com preço promocional
- **THEN** exibe o preço promocional em destaque, o preço original riscado e o percentual de desconto

#### Scenario: Poucas unidades
- **WHEN** o estoque do produto é maior que zero e não passa do limite de últimas unidades
- **THEN** o card informa quantas unidades restam

#### Scenario: Sem estoque
- **WHEN** o estoque do produto é zero
- **THEN** o card indica que o produto está sem estoque e continua clicável

#### Scenario: Sem avaliação
- **WHEN** o produto não tem avaliações
- **THEN** o card não exibe estrelas nem nota

### Requirement: Pedido visível sem rolar no celular
Na página de produto, em telas estreitas, o preço efetivo e a ação de pedido por WhatsApp SHALL
ficar visíveis sem rolagem, numa barra fixa que não esconde conteúdo da página. Quando o produto
exigir escolha de variação ainda não feita, a ação SHALL levar o visitante à escolha em vez de
aparecer desabilitada.

#### Scenario: Link aberto no celular
- **WHEN** a página de um produto é aberta numa tela de 390×844
- **THEN** o preço e a ação de pedido estão visíveis sem rolar

#### Scenario: Variação ainda não escolhida
- **WHEN** o produto tem variações, nenhuma foi escolhida e o visitante toca na ação de pedido
- **THEN** a página leva o visitante às opções de variação e o pedido não é aberto

#### Scenario: Fim da página
- **WHEN** o visitante rola até o fim da página de produto
- **THEN** o último conteúdo da página fica visível acima da barra fixa

### Requirement: Nada fixo sobre o conteúdo essencial
Nenhum elemento fixo ou flutuante da loja SHALL se sobrepor ao preço, à ação de pedido ou a um
botão de nova tentativa. O assistente SHALL continuar acessível em todas as telas.

#### Scenario: Assistente e preço
- **WHEN** a página de produto é aberta numa tela de 390×844
- **THEN** a área ocupada pelo acesso ao assistente não se sobrepõe à do preço nem à da ação de pedido

#### Scenario: Assistente e erro
- **WHEN** uma tela exibe o estado de erro com nova tentativa
- **THEN** o botão de nova tentativa não fica coberto por nenhum elemento fixo

#### Scenario: Acesso ao assistente
- **WHEN** o visitante está em qualquer tela da loja
- **THEN** encontra o acesso ao assistente sem rolar

### Requirement: Galeria do produto para toque
Com mais de uma imagem, a página de produto SHALL permitir passar as imagens com o dedo e SHALL
indicar qual imagem está sendo vista e quantas existem.

#### Scenario: Produto com três imagens
- **WHEN** o visitante desliza a imagem principal de um produto com três imagens
- **THEN** a próxima imagem aparece e o indicador mostra a posição atual

#### Scenario: Produto com uma imagem
- **WHEN** o produto tem uma única imagem
- **THEN** nenhum indicador de posição é exibido

### Requirement: Estados uniformes e escritos para o comprador
As telas da vitrine SHALL usar o mesmo componente para cada estado — carregando, vazio e erro —,
com o formato do conteúdo que substituem. O estado vazio SHALL oferecer uma ação de saída. O
estado de erro SHALL usar linguagem dirigida ao comprador, sem termos de operação do sistema, e
SHALL oferecer nova tentativa. A animação de carregamento SHALL ser suprimida quando o visitante
pedir movimento reduzido.

#### Scenario: Erro na home
- **WHEN** os destaques não carregam por falha de comunicação
- **THEN** a home mostra uma mensagem sem citar API ou servidor, com botão de nova tentativa

#### Scenario: Busca sem resultado com filtros
- **WHEN** a busca com filtros não encontra produto
- **THEN** a tela informa que nada foi encontrado e oferece limpar os filtros

#### Scenario: Movimento reduzido
- **WHEN** o sistema do visitante pede movimento reduzido e a tela está carregando
- **THEN** o esqueleto aparece sem animação

#### Scenario: Mesmo estado em telas diferentes
- **WHEN** o erro aparece na home e no catálogo
- **THEN** os dois usam as mesmas cores e o mesmo formato

### Requirement: Catálogo com produtos logo abaixo da busca no celular
Em telas estreitas, os filtros do catálogo SHALL ficar recolhidos atrás de uma única ação, e os
filtros ativos SHALL aparecer como itens removíveis, de modo que a grade de produtos comece logo
abaixo da busca.

#### Scenario: Filtro ativo no celular
- **WHEN** o visitante aplica uma categoria no celular
- **THEN** a categoria aparece como item removível acima da grade, e o endereço da página reflete o filtro

### Requirement: Ícones e prévia na identidade da loja
Os ícones da loja e a imagem padrão de prévia de link SHALL usar a identidade visual vigente e
SHALL manter os mesmos endereços já referenciados pelo HTML e pela prévia por produto.

#### Scenario: Prévia após o redesenho
- **WHEN** um serviço que não executa JavaScript lê o HTML de `/`
- **THEN** a imagem de prévia está no mesmo endereço de antes e reflete a nova identidade
