## ADDED Requirements

### Requirement: Vocabulário do domínio é o do Mart
Contratos públicos da API — nomes, descrições e exemplos publicados na documentação — SHALL
usar o vocabulário de catálogo de produtos, e NÃO SHALL apresentar exemplos de outro domínio
herdado do fork.

#### Scenario: Leitura da documentação da API
- **WHEN** alguém abre a documentação interativa para entender a API
- **THEN** os exemplos descrevem produtos do Mart, sem referência a imóveis ou corretores

### Requirement: Script de teste referencia caminho existente
Todo alvo de teste declarado no repositório SHALL apontar para caminhos que existem e SHALL
ser executável. Alvo que não roda SHALL ser corrigido ou removido, para não simular cobertura
inexistente.

#### Scenario: Execução da suíte declarada
- **WHEN** um desenvolvedor executa um alvo de teste declarado no projeto
- **THEN** a suíte roda e reporta resultado, em vez de falhar por caminho inexistente

### Requirement: Papéis descrevem o negócio do Mart
Os papéis de autorização SHALL representar funções deste produto — no mínimo usuário e
administrador de catálogo — e a troca de vocabulário NÃO SHALL invalidar o acesso de contas já
existentes sem plano de transição.

#### Scenario: Conta criada antes da mudança
- **WHEN** um usuário existente autentica após a revisão de papéis
- **THEN** o acesso dele é preservado conforme o plano de transição, sem perda silenciosa de permissão

### Requirement: Configuração de exemplo reflete o serviço real
O arquivo de exemplo de variáveis de ambiente SHALL refletir a porta e os nomes deste serviço,
de modo que um ambiente novo criado a partir dele funcione.

#### Scenario: Novo ambiente a partir do exemplo
- **WHEN** alguém copia o arquivo de exemplo para configurar o projeto
- **THEN** os valores apontam para as portas e nomes do Mart, sem herdar os de outro app
