# Spec Delta

## Purpose
Define a área do lojista dentro da loja do Mart: quem entra, o que vê, como cadastra, edita e
retira produto, e o que acontece com quem abre o admin antigo do site institucional.

## ADDED Requirements

### Requirement: Área do lojista exige login e papel de catálogo
A área do lojista SHALL exigir login. As telas de gestão SHALL aparecer só para usuário com
papel administrativo de catálogo, conforme o papel atual devolvido pela API no momento da
entrada. Usuário autenticado sem esse papel SHALL ver um aviso de acesso negado, sem formulário
e sem ação de escrita. A tela SHALL tratar o papel apenas como dica de exibição: toda escrita
SHALL depender da resposta da API.

#### Scenario: Visitante abre uma tela da área do lojista
- **WHEN** alguém sem sessão abre qualquer tela da área do lojista
- **THEN** é levado ao login, e depois de entrar volta à tela que tinha pedido

#### Scenario: Usuário sem papel de catálogo entra
- **WHEN** um usuário comum faz login na área do lojista
- **THEN** vê que a conta não tem acesso ao catálogo, e nenhuma ação de escrita é oferecida

#### Scenario: Papel retirado depois do login
- **WHEN** o papel administrativo de um usuário é retirado enquanto ele tem sessão aberta
- **THEN** a próxima entrada na área mostra o aviso de acesso negado, e qualquer escrita tentada é recusada pela API

#### Scenario: Credencial vence durante o uso
- **WHEN** a API responde 401 a uma ação da área do lojista
- **THEN** a sessão é encerrada e a pessoa volta ao login, com a indicação de que a sessão terminou

#### Scenario: Sair
- **WHEN** o lojista escolhe sair
- **THEN** a credencial guardada no navegador é apagada e a área volta a pedir login

### Requirement: Login informa credencial errada sem revelar contas
A tela de login SHALL dizer que e-mail ou senha estão incorretos quando a API recusar a
credencial, sem distinguir e-mail inexistente de senha errada, e SHALL avisar quando o limite de
tentativas for atingido.

#### Scenario: Senha errada
- **WHEN** alguém tenta entrar com senha errada
- **THEN** a tela mostra "E-mail ou senha incorretos" e não guarda credencial alguma

#### Scenario: Muitas tentativas
- **WHEN** a API recusa o login por excesso de tentativas
- **THEN** a tela diz para esperar antes de tentar de novo

### Requirement: A vitrine não carrega nem expõe a área do lojista
O código da área do lojista SHALL ser carregado apenas quando uma rota da área é aberta. As
páginas da área SHALL ser marcadas para não serem indexadas e não armazenadas em cache, e o
arquivo de robôs da loja SHALL excluir a área. O assistente de vendas da vitrine NÃO SHALL
aparecer dentro da área do lojista.

#### Scenario: Visitante abre a home
- **WHEN** um visitante carrega a home da loja
- **THEN** nenhum arquivo de código exclusivo da área do lojista é baixado

#### Scenario: Robô lê a área do lojista
- **WHEN** um robô de busca pede uma página da área do lojista
- **THEN** a resposta traz a indicação de não indexar, e o arquivo de robôs da loja exclui a área

### Requirement: Lista mostra todo o catálogo, inclusive inativos
A lista da área do lojista SHALL mostrar todos os produtos não removidos, ativos e inativos, com
foto de capa, nome, código, preço, estoque e indicação de ativo e de destaque, e SHALL permitir
filtrar por nome ou código. A lista SHALL vir da leitura administrativa da API, e não da
listagem pública.

#### Scenario: Produto desativado
- **WHEN** o lojista desativa um produto pela lista
- **THEN** o produto some da vitrine e continua na lista do lojista, marcado como inativo

#### Scenario: Destacar produto
- **WHEN** o lojista marca um produto ativo como destaque
- **THEN** o produto passa a aparecer entre os destaques da vitrine

#### Scenario: Filtrar por código
- **WHEN** o lojista digita parte de um código no filtro
- **THEN** a lista mostra só os produtos cujo nome ou código contém o texto

### Requirement: Formulário pede só o que a loja usa
O formulário de cadastro e edição SHALL exigir nome, código, preço, estoque, categoria,
subcategoria, descrição e ao menos uma foto. Dados fiscais e de fornecedor (NCM, GTIN,
fornecedor, custo, descrição do fornecedor) SHALL ser opcionais e agrupados numa seção
recolhível. O percentual de desconto SHALL ser calculado a partir do preço e do preço
promocional, e preço promocional maior ou igual ao preço SHALL ser recusado antes do envio. Nota
média e total de avaliações NÃO SHALL ser editáveis no formulário.

#### Scenario: Cadastro mínimo
- **WHEN** o lojista preenche só os campos obrigatórios e envia uma foto
- **THEN** o produto é criado, aparece na vitrine se estiver ativo, e a primeira foto é a capa

#### Scenario: Promoção inválida
- **WHEN** o preço promocional é maior ou igual ao preço
- **THEN** o formulário não envia e indica o campo a corrigir

#### Scenario: Código repetido
- **WHEN** o código informado já pertence a outro produto, inclusive um removido
- **THEN** a tela mostra o erro no campo de código sem perder o que foi preenchido

#### Scenario: Avaliações fora do formulário
- **WHEN** o lojista abre o formulário de um produto com avaliações
- **THEN** nota média e total de avaliações não aparecem como campos editáveis

### Requirement: Fotos são enviadas, ordenadas e removidas no formulário
O formulário SHALL enviar cada foto escolhida à API, mostrar a prévia, permitir reordenar e
remover fotos, e SHALL salvar o produto com a lista de fotos na ordem exibida, com a primeira
como capa. Arquivo recusado pela API SHALL ser indicado pelo nome, sem descartar as demais fotos.

#### Scenario: Várias fotos de uma vez
- **WHEN** o lojista escolhe três fotos ao mesmo tempo
- **THEN** as três aparecem como prévias distintas, e o produto salvo tem as três

#### Scenario: Reordenar fotos
- **WHEN** o lojista move a terceira foto para a primeira posição e salva
- **THEN** a vitrine mostra as fotos na nova ordem, com a nova primeira como capa

#### Scenario: Arquivo não aceito
- **WHEN** o lojista escolhe um PDF junto com duas fotos válidas
- **THEN** a tela diz que o PDF não foi aceito e mantém as duas fotos

### Requirement: Variações editáveis
O formulário SHALL permitir acrescentar, alterar e remover variações com nome obrigatório, cor
opcional em texto e indicação de disponibilidade, e a página do produto SHALL mostrar as
variações salvas.

#### Scenario: Acrescentar variação
- **WHEN** o lojista acrescenta a variação "Tamanho M", cor "Azul", disponível, e salva
- **THEN** a página do produto mostra a variação com o nome e a cor informados

### Requirement: Retirar produto tem duas intensidades
O lojista SHALL poder desativar um produto (some da vitrine, continua na lista) e SHALL poder
removê-lo (some da vitrine e da lista). Remover SHALL pedir confirmação.

#### Scenario: Remoção confirmada
- **WHEN** o lojista confirma a remoção de um produto
- **THEN** o produto some da lista e da vitrine, e o link dele responde "não encontrado"

#### Scenario: Remoção cancelada
- **WHEN** o lojista cancela a confirmação de remoção
- **THEN** o produto continua como estava

### Requirement: Reindexação da busca é explícita
A área do lojista SHALL oferecer a reindexação da busca do catálogo como ação separada, com
confirmação que avise que a operação consome crédito de IA, e SHALL mostrar o resultado
(produtos processados e erros).

#### Scenario: Reindexar
- **WHEN** o lojista confirma a reindexação
- **THEN** a tela mostra quantos produtos foram processados e quantos falharam

### Requirement: Admin antigo do institucional leva à loja
As rotas de administração do Mart no site institucional SHALL redirecionar para a área do
lojista em `mart.gwan.cloud`, e o site institucional NÃO SHALL mais oferecer telas de escrita do
catálogo do Mart.

#### Scenario: Link antigo da lista
- **WHEN** alguém abre `gwan.cloud/admin/mart`
- **THEN** é levado a `mart.gwan.cloud/admin`

#### Scenario: Link antigo de edição
- **WHEN** alguém abre `gwan.cloud/admin/mart/product/<código>/edit`
- **THEN** é levado à lista da área do lojista em `mart.gwan.cloud/admin`
