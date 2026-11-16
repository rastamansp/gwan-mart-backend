## ADDED Requirements

### Requirement: Busca do catálogo não falha por falta de provedor de embedding
A busca por similaridade SHALL responder com sucesso mesmo quando não houver provedor de
embedding configurado ou quando o provedor falhar, caindo para uma busca textual sobre nome,
código, categoria e subcategoria dos produtos ativos. A falta ou a falha do provedor NÃO SHALL
produzir erro interno (5xx) para quem consulta.

#### Scenario: Sem provedor de embedding configurado
- **WHEN** a busca é chamada e não há chave do provedor de embedding no ambiente
- **THEN** a resposta é bem-sucedida, contém os produtos cujo nome, código, categoria ou subcategoria casam com o termo, e indica o modo textual

#### Scenario: Provedor configurado mas falhando
- **WHEN** a chave existe e a geração do embedding falha em tempo de execução
- **THEN** a falha é registrada em log, a resposta é bem-sucedida com resultados textuais e indica o modo textual

#### Scenario: Provedor disponível
- **WHEN** o provedor de embedding responde
- **THEN** a busca é semântica, cada resultado traz o grau de similaridade e a resposta indica o modo semântico

### Requirement: Busca textual tolerante a caixa e acento
A busca textual SHALL ignorar diferenças de maiúsculas/minúsculas e de acentuação entre o termo
e os campos pesquisados, e SHALL tratar caracteres curinga do termo como texto literal.

#### Scenario: Termo sem acento encontra produto acentuado
- **WHEN** o visitante busca "cafe" e existe um produto chamado "Café Especial"
- **THEN** o produto aparece no resultado textual

### Requirement: Modo textual não inventa similaridade
No modo textual a resposta NÃO SHALL atribuir grau de similaridade aos resultados; o campo de
similaridade SHALL vir ausente de valor (nulo).

#### Scenario: Resultado textual
- **WHEN** a busca cai para o modo textual
- **THEN** nenhum resultado traz percentual de similaridade
