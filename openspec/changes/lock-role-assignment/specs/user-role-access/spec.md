# Spec Delta

## Purpose
Define quem pode criar, ver, alterar e apagar usuários da API do Mart, e por qual único caminho
o papel de um usuário muda, para que o papel administrativo não possa ser autoconcedido.

## ADDED Requirements

### Requirement: Cadastro público não define papel
O cadastro público SHALL criar todo usuário com o papel de usuário comum. Uma requisição de
cadastro que informe papel SHALL ser recusada com 400, sem criar usuário.

#### Scenario: Cadastro informando papel administrativo
- **WHEN** um cliente anônimo envia um cadastro válido com papel administrativo no corpo
- **THEN** a API responde 400 e nenhum usuário é criado

#### Scenario: Cadastro sem papel
- **WHEN** um cliente anônimo envia um cadastro válido sem papel
- **THEN** o usuário é criado com o papel de usuário comum

### Requirement: Papel só muda pela promoção feita por administrador
O papel de um usuário SHALL mudar apenas pela operação de promoção, e somente quando quem a
executa tem papel administrativo. A edição de cadastro NÃO SHALL aceitar papel: uma edição que
o informe SHALL ser recusada com 400, sem alterar o usuário — inclusive quando feita por
administrador.

#### Scenario: Usuário tenta se autopromover pela edição
- **WHEN** um usuário comum edita o próprio cadastro informando papel administrativo
- **THEN** a API responde 400 e o papel do usuário continua o mesmo

#### Scenario: Usuário comum tenta promover
- **WHEN** um usuário comum chama a promoção para qualquer usuário, inclusive ele mesmo
- **THEN** a API responde 403 e nenhum papel é alterado

#### Scenario: Administrador promove
- **WHEN** um administrador promove um usuário comum
- **THEN** o papel do usuário passa a ser o pedido e vale na próxima requisição dele

### Requirement: Usuário acessa apenas o próprio cadastro
Um usuário autenticado sem papel administrativo SHALL poder ler e editar apenas o próprio
cadastro. Ler ou editar o cadastro de outro usuário, listar usuários e apagar usuários SHALL
ser recusado com 403. Um administrador SHALL poder executar todas essas operações.
Requisição sem credencial SHALL ser recusada com 401.

#### Scenario: Usuário comum lista usuários
- **WHEN** um usuário comum pede a lista de usuários
- **THEN** a API responde 403 sem devolver dado de usuário algum

#### Scenario: Usuário comum lê outro usuário
- **WHEN** um usuário comum pede o cadastro de outro usuário pelo identificador
- **THEN** a API responde 403

#### Scenario: Usuário comum edita o próprio nome
- **WHEN** um usuário comum altera o próprio nome ou telefone
- **THEN** a alteração é gravada e devolvida

#### Scenario: Usuário comum apaga alguém
- **WHEN** um usuário comum pede para apagar qualquer usuário
- **THEN** a API responde 403 e o usuário continua existindo

#### Scenario: Administrador lista usuários
- **WHEN** um administrador pede a lista de usuários
- **THEN** a lista é devolvida, sem senha nem hash de senha

### Requirement: Área administrativa exige papel administrativo
Toda rota da área administrativa SHALL exigir requisição autenticada de usuário com papel
administrativo: sem credencial, 401; autenticado sem o papel, 403.

#### Scenario: Usuário comum abre o dashboard administrativo
- **WHEN** um usuário comum pede as estatísticas do dashboard administrativo
- **THEN** a API responde 403

#### Scenario: Administrador abre o dashboard
- **WHEN** um administrador pede as estatísticas do dashboard
- **THEN** as estatísticas são devolvidas

### Requirement: Papel é avaliado pelo estado atual do usuário
A autorização por papel SHALL considerar o papel gravado do usuário no momento da requisição,
não o papel registrado quando a credencial foi emitida.

#### Scenario: Papel alterado depois do login
- **WHEN** o papel de um usuário muda enquanto ele tem uma credencial válida
- **THEN** a próxima requisição dele é autorizada de acordo com o papel novo

### Requirement: Usuário inexistente responde 404
Operação sobre usuário identificado que não existe SHALL responder 404, e não erro interno.

#### Scenario: Administrador lê usuário inexistente
- **WHEN** um administrador pede um usuário por um identificador que não existe
- **THEN** a API responde 404
