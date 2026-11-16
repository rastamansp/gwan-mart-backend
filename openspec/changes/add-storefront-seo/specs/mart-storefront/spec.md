## ADDED Requirements

### Requirement: Prévia de link legível sem JavaScript
Todo HTML servido pela loja SHALL conter, sem depender de execução de JavaScript, as meta tags de
prévia de link: `og:title`, `og:description`, `og:image`, `og:url`, `og:type` e `twitter:card`.
A `og:image` SHALL ser uma URL absoluta servida pela própria loja, quando não houver imagem
específica da página.

#### Scenario: Link da home colado numa conversa
- **WHEN** um serviço que não executa JavaScript lê o HTML de `/`
- **THEN** encontra o título, a descrição e a imagem padrão da loja, com a imagem em URL absoluta

### Requirement: Prévia de link por produto
O HTML servido em `/product/:code` SHALL trazer, sem depender de JavaScript, título, descrição,
imagem e URL canônica **daquele produto**. Quando o produto não existir, estiver inativo ou a
API estiver indisponível, a página SHALL ser servida normalmente com as meta tags padrão da loja.
Todo texto do catálogo SHALL ser escapado antes de ir para o HTML.

#### Scenario: Link de produto ativo
- **WHEN** um serviço que não executa JavaScript lê o HTML de `/product/PROD-001`
- **THEN** encontra o nome do produto no título, o preço na descrição, a imagem do produto e a URL do produto

#### Scenario: Produto inexistente
- **WHEN** o HTML de `/product/<código inexistente>` é pedido
- **THEN** a página é servida com as meta tags padrão da loja, e não com erro

#### Scenario: API indisponível
- **WHEN** a API não responde ao montar a prévia
- **THEN** a página é servida com as meta tags padrão, sem atraso maior que o timeout configurado

#### Scenario: Nome de produto com caracteres de HTML
- **WHEN** o nome ou a descrição do produto contém `<`, `>`, `&` ou aspas
- **THEN** eles aparecem escapados no HTML, sem abrir tag nem quebrar atributo

### Requirement: Título da aba por página
A loja SHALL definir o título da aba conforme a página: a home com o nome da loja, o catálogo
identificado como tal, a página de produto com o nome do produto e a página inexistente
identificada como não encontrada.

#### Scenario: Página de produto carregada
- **WHEN** a página de um produto termina de carregar
- **THEN** o título da aba contém o nome do produto

### Requirement: Ícones da loja
A loja SHALL ter favicon e ícone para tela inicial próprios do Gwan Mart, sem marca de
terceiros.

#### Scenario: Aba do navegador
- **WHEN** a loja é aberta no navegador
- **THEN** a aba exibe o ícone do Gwan Mart

### Requirement: robots.txt e sitemap.xml
A loja SHALL responder `robots.txt` apontando para o sitemap em URL absoluta, e `sitemap.xml`
gerado a partir do catálogo, listando a home, o catálogo e a página de cada produto **ativo**
com o mesmo endereço que o bot usa nos links.

#### Scenario: Produto inativo
- **WHEN** um produto é desativado
- **THEN** ele deixa de aparecer no `sitemap.xml`

#### Scenario: robots.txt sem a API
- **WHEN** a API está fora do ar
- **THEN** o `robots.txt` continua respondendo
