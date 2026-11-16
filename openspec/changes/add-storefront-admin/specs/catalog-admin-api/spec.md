# Spec Delta

## Purpose
Define o que a API do Mart oferece à administração do catálogo: leitura administrativa, envio de
foto, edição de fotos e variações, erros previsíveis e o login que dá acesso a isso.

## ADDED Requirements

### Requirement: Leitura administrativa do catálogo
A API SHALL oferecer uma listagem administrativa com todos os produtos não removidos, ativos e
inativos, com as fotos em ordem, e uma leitura administrativa de um produto por identificador,
ativo ou inativo. Ambas SHALL exigir papel administrativo de catálogo: sem credencial, 401;
autenticado sem o papel, 403. Produto inexistente ou removido SHALL responder 404.

#### Scenario: Administrador lista o catálogo
- **WHEN** um administrador pede a listagem administrativa
- **THEN** recebe os produtos ativos e inativos, sem os removidos

#### Scenario: Administrador lê produto inativo
- **WHEN** um administrador pede um produto inativo pelo identificador
- **THEN** recebe o produto com fotos e variações

#### Scenario: Usuário comum tenta a leitura administrativa
- **WHEN** um usuário autenticado sem papel de catálogo pede a listagem administrativa
- **THEN** a API responde 403 sem devolver produto algum

#### Scenario: Produto removido
- **WHEN** um administrador pede pelo identificador um produto removido
- **THEN** a API responde 404

### Requirement: Envio de foto de produto
A API SHALL aceitar o envio de uma foto por requisição, apenas JPG, PNG ou WebP identificados
pelo conteúdo do arquivo (e não pelo nome ou tipo declarado), com até 5 MB, e SHALL devolver uma
URL que abre sem autenticação. Cada envio SHALL gravar um objeto novo, de nome único, mesmo
quando vários envios chegam ao mesmo tempo. O envio SHALL exigir papel administrativo de
catálogo. Arquivo recusado NÃO SHALL ser gravado.

#### Scenario: Foto válida
- **WHEN** um administrador envia uma foto JPG de 2 MB
- **THEN** a API responde 201 com uma URL que abre no navegador sem login

#### Scenario: Envios simultâneos
- **WHEN** um administrador envia três fotos diferentes em paralelo
- **THEN** recebe três URLs distintas, e cada uma abre a foto correspondente

#### Scenario: Arquivo disfarçado
- **WHEN** alguém envia um PDF renomeado para `.jpg` com tipo declarado `image/jpeg`
- **THEN** a API responde 400 e nada é gravado

#### Scenario: Arquivo grande demais
- **WHEN** alguém envia uma imagem de 8 MB
- **THEN** a API responde 413 e nada é gravado

#### Scenario: Envio sem papel
- **WHEN** um usuário sem papel de catálogo, ou sem credencial, tenta enviar foto
- **THEN** a API responde 403 ou 401, respectivamente

### Requirement: Só fotos de produto são públicas no storage
O storage do Mart SHALL permitir leitura anônima apenas dos objetos de fotos de produto; os
demais objetos do bucket SHALL continuar exigindo credencial. A falha em aplicar essa regra na
inicialização NÃO SHALL impedir a API de subir, e SHALL ser registrada em log com a ação manual
necessária.

#### Scenario: Objeto fora das fotos de produto
- **WHEN** alguém sem credencial pede um objeto do bucket que não é foto de produto
- **THEN** o storage recusa o acesso

#### Scenario: Credencial sem permissão de política
- **WHEN** a API inicia com uma credencial de storage que não pode alterar a política do bucket
- **THEN** a API sobe normalmente e registra um aviso com o comando para aplicar a política à mão

### Requirement: Edição substitui fotos sem erro interno
A edição de produto SHALL aceitar a lista completa de fotos na ordem desejada e substituí-la por
inteiro numa única transação. Lista vazia SHALL remover todas as fotos, e omitir a lista SHALL
manter as fotos atuais.

#### Scenario: Trocar a ordem das fotos
- **WHEN** um administrador edita um produto enviando as mesmas fotos em outra ordem
- **THEN** a API responde 200 e devolve as fotos na ordem enviada

#### Scenario: Editar só o estoque
- **WHEN** um administrador edita apenas o estoque de um produto com fotos
- **THEN** as fotos do produto continuam as mesmas

#### Scenario: Remover todas as fotos
- **WHEN** um administrador edita um produto enviando lista de fotos vazia
- **THEN** o produto fica sem fotos

### Requirement: Variações são validadas e gravadas como enviadas
A criação e a edição de produto SHALL aceitar variações com nome obrigatório, cor opcional e
disponibilidade opcional, e SHALL gravá-las exatamente como enviadas. Variação sem nome SHALL
ser recusada com 400, sem alterar o produto.

#### Scenario: Duas variações
- **WHEN** um administrador edita um produto enviando duas variações válidas
- **THEN** a resposta e a leitura seguinte trazem as duas variações com os mesmos campos

#### Scenario: Variação sem nome
- **WHEN** um administrador envia uma variação sem nome
- **THEN** a API responde 400 e as variações do produto não mudam

### Requirement: Código repetido responde conflito
Criar ou editar produto com um código que já pertence a outro produto, inclusive a um produto
removido, SHALL responder 409 com mensagem que identifique o código, e NÃO SHALL responder erro
interno.

#### Scenario: Cadastro com código existente
- **WHEN** um administrador cria um produto com o código de outro produto já cadastrado
- **THEN** a API responde 409 e nenhum produto é criado

### Requirement: Login recusa credencial errada com 401 e limita tentativas
O login SHALL responder 401 para e-mail inexistente ou senha errada, com a mesma mensagem nos
dois casos, e SHALL limitar as tentativas por cliente num intervalo configurável, com padrão
seguro quando nada for configurado. Tentativas além do limite SHALL ser recusadas com 429 antes
de qualquer verificação de senha.

#### Scenario: Senha errada
- **WHEN** alguém tenta entrar com um e-mail cadastrado e a senha errada
- **THEN** a API responde 401, e não erro interno

#### Scenario: E-mail inexistente
- **WHEN** alguém tenta entrar com um e-mail que não existe
- **THEN** a API responde 401 com a mesma mensagem da senha errada

#### Scenario: Rajada de tentativas
- **WHEN** um mesmo cliente tenta entrar repetidas vezes acima do limite
- **THEN** as tentativas excedentes recebem 429
