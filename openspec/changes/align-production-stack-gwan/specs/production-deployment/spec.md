## ADDED Requirements

### Requirement: Artefatos de publicação descrevem este serviço
Todo arquivo de orquestração versionado no repositório SHALL descrever o Gwan Mart — nome de
serviço, imagem, domínios e variáveis. Artefato herdado que publique outro aplicativo SHALL
ser corrigido ou removido.

#### Scenario: Stack colada no Portainer
- **WHEN** o mantenedor usa o arquivo de stack versionado para publicar o Mart
- **THEN** a stack criada é a do Mart, com o nome de serviço e os domínios do Mart

### Requirement: Conformidade com o padrão de infraestrutura GWAN
A orquestração de produção SHALL usar a rede externa compartilhada do ecossistema, domínio sob
`gwan.cloud`, política de restart `unless-stopped`, rotação de log e limites de recurso, e
NÃO SHALL redeclarar middlewares globais já providos pelo proxy da infraestrutura.

#### Scenario: Publicação na infraestrutura existente
- **WHEN** a stack é implantada no host do ecossistema
- **THEN** o serviço entra na rede compartilhada, é roteado pelo proxy com certificado automático e não conflita com middlewares existentes

### Requirement: Aplicação do schema tem dono explícito
O caminho pelo qual as migrations são aplicadas em produção SHALL estar definido e ativo —
seja no ciclo de inicialização do container, seja como procedimento operacional documentado.
Script que prometa aplicar migrations SHALL ser efetivamente executado ou removido.

#### Scenario: Primeiro deploy num banco vazio
- **WHEN** o serviço é implantado pela primeira vez
- **THEN** as migrations são aplicadas pelo caminho definido, e as rotas de catálogo respondem sobre um schema completo

### Requirement: Integração contínua verifica, não anuncia deploy
O fluxo de CI SHALL executar build e testes automatizados, e NÃO SHALL conter passo que
declare deploy sem publicar nada — publicação é feita exclusivamente pelo Portainer.

#### Scenario: Push na branch principal
- **WHEN** um commit chega à branch principal
- **THEN** o CI executa build e testes e reporta o resultado real, sem relatar deploy

#### Scenario: Suíte de teste quebrada
- **WHEN** a suíte referencia caminho inexistente ou falha
- **THEN** o CI falha visivelmente, em vez de seguir para um passo de sucesso
