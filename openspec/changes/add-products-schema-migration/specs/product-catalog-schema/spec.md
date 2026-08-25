## ADDED Requirements

### Requirement: Schema do catálogo versionado em migration
O schema das tabelas de produto — produto, imagens e chunks de busca — SHALL ser criado por
migration versionada no repositório, e NÃO por sincronização automática de entidades. Um
ambiente novo, sem banco preexistente, SHALL chegar ao schema completo executando apenas as
migrations.

#### Scenario: Ambiente de produção sem tabelas
- **WHEN** a aplicação é implantada num banco vazio com sincronização automática desligada
- **THEN** executar as migrations cria todas as tabelas do catálogo, e as rotas de produto respondem normalmente

#### Scenario: Migration reexecutada
- **WHEN** as migrations são executadas de novo sobre um banco que já as aplicou
- **THEN** a execução termina sem erro e sem alterar dados

### Requirement: DataSource de CLI espelha o runtime
A DataSource usada pelo CLI de migrations SHALL reconhecer o mesmo conjunto de entidades que a
aplicação carrega em runtime, de modo que a geração de migration não produza diff incompleto.

#### Scenario: Entidade nova é adicionada
- **WHEN** uma entidade nova entra na aplicação e uma migration é gerada
- **THEN** o diff gerado contempla essa entidade, sem exigir edição manual da lista de entidades

### Requirement: Representação explícita do vetor de busca
O armazenamento do embedding usado pela busca semântica de produtos SHALL estar declarado no
schema versionado, incluindo a extensão de banco que ele exigir.

#### Scenario: Banco novo recebe o schema
- **WHEN** as migrations são aplicadas num PostgreSQL limpo
- **THEN** a estrutura que guarda os embeddings existe e a busca semântica funciona sem passo manual de criação de extensão
