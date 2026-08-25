## ADDED Requirements

### Requirement: Escrita no catálogo exige papel administrativo
Toda rota que cria, altera, importa ou remove produto SHALL exigir requisição autenticada de
usuário com papel administrativo. Requisição sem credencial SHALL ser recusada com 401 e
requisição autenticada sem o papel SHALL ser recusada com 403, em ambos os casos sem efeito no
banco.

#### Scenario: Importação em lote anônima
- **WHEN** uma requisição sem credencial chama a importação de produtos em lote
- **THEN** a API responde 401 e nenhum produto é criado

#### Scenario: Usuário comum tenta escrever
- **WHEN** um usuário autenticado sem papel administrativo tenta criar ou importar produto
- **THEN** a API responde 403 e o catálogo permanece inalterado

#### Scenario: Administrador importa
- **WHEN** um usuário com papel administrativo importa um lote válido
- **THEN** os produtos são criados normalmente

### Requirement: Operação paga de IA não é anônima e ilimitada
Rota que dispara chamada paga a provedor de IA — como gerar embedding para busca semântica —
SHALL exigir autenticação ou aplicar limite por cliente, de modo que um chamador anônimo não
consiga provocar gasto ilimitado.

#### Scenario: Rajada anônima na busca semântica
- **WHEN** um cliente anônimo dispara buscas semânticas em sequência acima do permitido
- **THEN** as requisições excedentes são recusadas antes de chamar o provedor de IA

### Requirement: Documentação da API reflete a proteção real
A documentação gerada SHALL indicar a exigência de credencial nas rotas protegidas e NÃO SHALL
anunciar como aberta uma rota que exige autenticação.

#### Scenario: Leitura do Swagger
- **WHEN** alguém abre a documentação da API
- **THEN** as rotas de escrita de catálogo aparecem marcadas como autenticadas, com o esquema de token

### Requirement: Segredo de assinatura único e obrigatório
O componente que emite o token e o que o valida SHALL derivar o segredo da mesma fonte de
configuração, resolvida após o carregamento do ambiente. NÃO SHALL existir segredo padrão no
código: faltando a configuração, a aplicação SHALL recusar iniciar.

#### Scenario: Token emitido pela própria aplicação
- **WHEN** um usuário autentica e usa o token devolvido em rota protegida
- **THEN** o token é aceito

#### Scenario: Segredo ausente na configuração
- **WHEN** a aplicação é iniciada sem o segredo configurado
- **THEN** a inicialização falha com mensagem explícita, em vez de assumir um segredo conhecido

#### Scenario: Token expirado
- **WHEN** um token cujo prazo venceu é apresentado
- **THEN** a requisição é recusada

### Requirement: Credencial não vive no código
Scripts operacionais SHALL obter endereço e credenciais de banco de dados da configuração de
ambiente, e NÃO SHALL trazer valores padrão que apontem para infraestrutura real.

#### Scenario: Script executado sem configuração
- **WHEN** um script operacional roda sem a variável de conexão definida
- **THEN** ele falha imediatamente com mensagem clara, sem tentar conectar a um ambiente real
