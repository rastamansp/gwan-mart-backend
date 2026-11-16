## ADDED Requirements

### Requirement: Health reflete a capacidade de atender
A rota de health SHALL verificar as dependências externas necessárias para servir requisições
— ao menos o banco de dados e o armazenamento de objetos — e SHALL reportar estado não-saudável
quando uma dependência obrigatória estiver indisponível. NÃO SHALL reportar saudável apenas por
o processo estar em execução.

#### Scenario: Banco de dados fora do ar
- **WHEN** o PostgreSQL está inacessível e a rota de health é consultada
- **THEN** a resposta indica estado não-saudável e nomeia a dependência que falhou

#### Scenario: Tudo disponível
- **WHEN** todas as dependências respondem
- **THEN** a resposta indica estado saudável, mantendo os campos informativos já publicados

### Requirement: Dependência opcional degrada, não derruba
Dependência cuja ausência apenas reduz desempenho — como o cache — SHALL produzir estado
degradado, com o serviço continuando a atender, e NÃO SHALL causar reinício do container.

#### Scenario: Cache indisponível
- **WHEN** o Redis está fora e a rota de health é consultada
- **THEN** a resposta indica degradação, o catálogo e o chat continuam respondendo e o container não é reiniciado por isso

### Requirement: Verificação barata e limitada no tempo
Cada verificação de dependência SHALL ter limite de tempo próprio, de modo que a resposta do
health caiba no intervalo com que o orquestrador a consulta e não vire carga relevante nas
dependências.

#### Scenario: Dependência lenta
- **WHEN** uma dependência demora além do limite configurado
- **THEN** a verificação daquela dependência é encerrada e reportada como falha, sem travar a resposta do health
