## ADDED Requirements

### Requirement: Health informa a disponibilidade da busca por similaridade
A rota de health SHALL reportar o estado do provedor de embedding entre as dependências, sem
chamá-lo a cada verificação. Provedor não configurado SHALL aparecer como desabilitado e NÃO
SHALL rebaixar o status geral; provedor configurado cuja última chamada falhou SHALL aparecer
como fora do ar, não crítico, rebaixando o status geral para degradado.

#### Scenario: Chave do provedor ausente
- **WHEN** não há chave do provedor de embedding e as demais dependências estão de pé
- **THEN** o health indica a busca por similaridade como desabilitada e o status geral continua saudável

#### Scenario: Provedor configurado falhando
- **WHEN** a chave existe e a última geração de embedding falhou
- **THEN** o health indica a dependência como fora do ar com a mensagem do erro, e o status geral é degradado, sem 503

#### Scenario: Provedor recuperado
- **WHEN** uma geração de embedding volta a ter sucesso depois de uma falha
- **THEN** o health volta a indicar a dependência como disponível
