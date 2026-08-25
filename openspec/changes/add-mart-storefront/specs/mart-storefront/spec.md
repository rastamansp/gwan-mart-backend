## ADDED Requirements

### Requirement: Loja própria, versionada junto da API
O Gwan Mart SHALL ter uma loja própria, publicada em domínio próprio e versionada no mesmo
repositório da API que ela consome. A loja NÃO SHALL depender do repositório ou do deploy do
site institucional para ser alterada ou publicada.

#### Scenario: Alteração na vitrine
- **WHEN** alguém precisa mudar como os produtos aparecem na loja
- **THEN** a mudança acontece neste repositório e é publicada sem tocar no site institucional

#### Scenario: Publicação em stack única
- **WHEN** a loja precisa ser atualizada
- **THEN** basta atualizar as propriedades da stack já existente, sem criar uma segunda stack para o mesmo produto

### Requirement: Catálogo navegável a partir da API real
A loja SHALL apresentar os produtos vindos da API — destaques, listagem com busca, filtro por
categoria e paginação, e detalhe de produto — sem dados fabricados no cliente.

#### Scenario: Catálogo com produtos cadastrados
- **WHEN** um visitante abre o catálogo e a API tem produtos ativos
- **THEN** a loja exibe os produtos com nome, imagem e preço, respeitando o preço promocional quando existir

#### Scenario: Busca sem resultado
- **WHEN** a busca não encontra produto algum
- **THEN** a loja informa que nada foi encontrado, sem parecer que está carregando

### Requirement: Produto endereçável pelo código
Cada produto SHALL ter endereço próprio derivado do seu código de negócio, de modo que o link
gerado pelo chat e o link compartilhado por um visitante levem à mesma página.

#### Scenario: Link vindo do chat
- **WHEN** o visitante abre o link "Ver detalhes" que o bot devolveu
- **THEN** a página daquele produto abre na loja

#### Scenario: Código inexistente
- **WHEN** a URL aponta para um código que não existe
- **THEN** a loja mostra uma página de produto não encontrado, com caminho de volta ao catálogo

### Requirement: Chat do Mart dentro da loja
A loja SHALL oferecer o assistente do Mart, mantendo a mesma sessão entre mensagens de uma
conversa, e SHALL apresentar os produtos citados de forma navegável.

#### Scenario: Conversa com continuidade
- **WHEN** o visitante envia uma segunda mensagem na mesma conversa
- **THEN** a requisição reaproveita a sessão anterior, e a resposta considera o que já foi dito

#### Scenario: Assistente indisponível
- **WHEN** a chamada ao chat falha
- **THEN** a loja informa a falha e permite tentar de novo, sem derrubar a navegação do catálogo

### Requirement: Degradação visível quando a API não responde
Cada tela que depende da API SHALL distinguir carregando, vazio e erro, e NÃO SHALL apresentar
tela em branco quando a API estiver indisponível.

#### Scenario: API fora do ar
- **WHEN** a API não responde e o visitante abre a loja
- **THEN** a loja mostra o estado de erro e oferece nova tentativa
