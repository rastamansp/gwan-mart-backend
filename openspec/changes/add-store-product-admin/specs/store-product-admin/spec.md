# Spec Delta

## Purpose
Define como o catálogo do Mart é administrado pela própria loja: quem entra na área do lojista,
o que ela mostra e como produtos e fotos são cadastrados, alterados e retirados.

## ADDED Requirements

### Requirement: Área do lojista exige login com papel de catálogo
A área do lojista SHALL exigir login. Só usuário com papel administrativo (ADMIN) SHALL
ver as telas de gestão; usuário autenticado sem esse papel SHALL ver uma mensagem de acesso
negado, sem formulário. A sessão SHALL terminar quando a credencial expirar ou a API recusá-la.

#### Scenario: Visitante abre a área do lojista
- **WHEN** alguém sem sessão abre qualquer tela da área do lojista
- **THEN** é levado ao login, e depois de entrar volta à tela que tinha pedido

#### Scenario: Usuário comum entra
- **WHEN** um usuário sem papel de catálogo faz login na área do lojista
- **THEN** vê que não tem acesso, e nenhuma ação de escrita é oferecida

#### Scenario: Credencial vence durante o uso
- **WHEN** a API responde 401 a uma ação da área do lojista
- **THEN** a sessão é encerrada e a pessoa volta ao login, sem perder a indicação do erro

### Requirement: Lista mostra todo o catálogo, inclusive inativos
A lista da área do lojista SHALL mostrar todos os produtos não removidos, ativos e inativos,
com foto, nome, código, preço, estoque e indicação de ativo e destaque, e SHALL permitir
buscar por nome ou código.

#### Scenario: Produto inativo
- **WHEN** um produto é desativado
- **THEN** ele some da vitrine e continua na lista do lojista, marcado como inativo

### Requirement: Cadastro pede só o que a loja usa
O formulário SHALL exigir nome, código, preço, estoque, categoria, subcategoria, descrição e ao
menos uma foto. Dados fiscais e de fornecedor (NCM, GTIN, fornecedor, custo, descrição do
fornecedor) SHALL ser opcionais na tela. O percentual de desconto SHALL ser calculado a partir do
preço e do preço promocional, e preço promocional maior ou igual ao preço SHALL ser recusado.

#### Scenario: Cadastro mínimo
- **WHEN** o lojista preenche só os campos obrigatórios e envia uma foto
- **THEN** o produto é criado, aparece na vitrine se estiver ativo, e a primeira foto é a capa

#### Scenario: Promoção inválida
- **WHEN** o preço promocional é maior ou igual ao preço
- **THEN** o formulário não envia e diz qual campo corrigir

#### Scenario: Código repetido
- **WHEN** o código informado já pertence a outro produto
- **THEN** a tela mostra o erro sem perder o que foi preenchido

### Requirement: Fotos sobem para o storage do Mart e ficam públicas
Upload de foto SHALL aceitar apenas jpg, png e webp de até 5 MB, SHALL exigir papel de catálogo
e SHALL devolver uma URL que abre sem autenticação. Só o prefixo de fotos de produto SHALL ser
público; o restante do bucket SHALL continuar privado.

#### Scenario: Foto válida
- **WHEN** o lojista envia uma foto jpg de 2 MB
- **THEN** recebe uma URL que abre no navegador sem login

#### Scenario: Arquivo não aceito
- **WHEN** alguém envia um PDF ou uma imagem de 8 MB
- **THEN** a API recusa (400 para o tipo, 413 para o tamanho) e nada é gravado

#### Scenario: Upload sem papel
- **WHEN** um usuário sem papel de catálogo, ou sem login, tenta enviar foto
- **THEN** a API responde 403 ou 401

### Requirement: Edição troca fotos e dados sem erro interno
Editar um produto SHALL aceitar a lista completa de fotos na ordem desejada, substituindo a
anterior; lista vazia SHALL remover todas as fotos; omitir a lista SHALL manter as fotos atuais.

#### Scenario: Trocar a ordem das fotos
- **WHEN** o lojista reordena as fotos e salva
- **THEN** a vitrine mostra as fotos na nova ordem, e a primeira passa a ser a capa

#### Scenario: Editar só o estoque
- **WHEN** o lojista muda só o estoque
- **THEN** as fotos do produto continuam as mesmas

### Requirement: Retirar produto tem duas intensidades
O lojista SHALL poder desativar um produto (some da vitrine, continua na lista) e SHALL poder
removê-lo (some da vitrine e da lista). Remover SHALL pedir confirmação.

#### Scenario: Remoção confirmada
- **WHEN** o lojista confirma a remoção de um produto
- **THEN** o produto some da lista e da vitrine, e o link dele responde "não encontrado"
