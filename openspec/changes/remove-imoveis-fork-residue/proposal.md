# Proposal — remove-imoveis-fork-residue

## Why

Este repo é um fork do `gwan-imoveis-backend` — que por sua vez carrega peças do
`gwan-events-backend`. A migração trocou o domínio (imóveis → produtos), mas parou no meio:
**22 arquivos `.ts` ainda falam de imóvel, propriedade ou corretor**, e o resíduo não é só
estético.

Onde ele morde:

- **`test:bdd` está quebrado**: o script aponta para `src/properties/steps/` e
  `src/properties/features/`, diretórios que não existem. Qualquer tentativa de rodar a suíte
  BDD falha na largada — motivo provável de o CI nunca ter chamado teste nenhum.
- **Papel `ORGANIZER`/corretor**: uma das duas migrations do repo chama-se
  `MigrateOrganizerToCorretor`. O modelo de papéis do Mart herdou vocabulário de outro negócio,
  e a change de segurança (`secure-catalog-write-endpoints`) precisa saber quem é
  administrador de catálogo.
- **Exemplos de Swagger mentem**: o DTO do chat exemplifica `"Liste imóveis em São Sebastião"`.
  Quem abre `/api` para entender a API do Mart lê sobre imóveis.
- **Seeds com `@gwan.com.br`**: domínio legado, no mesmo padrão que já foi corrigido no CORS e
  nos links de produto.

O custo disso é de leitura e de confiança: cada resíduo obriga quem chega a decidir se aquilo
é intencional. E ele cresce — o `product-url.ts` só existiu porque um link de produto foi
montado com o domínio de um site que nunca existiu.

## What Changes

- **Suíte BDD volta a existir ou sai do repo**: corrigir `test:bdd` para os caminhos reais
  (`src/products/tests/bdd/`) ou remover o alvo. Script que nunca roda é pior que ausência de
  teste, porque simula cobertura.
- **Vocabulário de domínio unificado em produto**: DTOs de auth/usuário/chat, exemplos de
  Swagger e mensagens que ainda falam de imóvel/propriedade/corretor passam a falar de produto.
- **Papéis revistos**: decidir o conjunto real do Mart (ao menos usuário e administrador de
  catálogo) e aposentar o vocabulário herdado, sem quebrar tokens já emitidos.
- **Seeds e fixtures com o domínio canônico** `gwan.cloud`.
- **`.env.example` sincronizado com a realidade**: hoje ele indica porta `3009` (a do imóveis),
  enquanto o slot do Mart é `3011`.

**Fora de escopo:** renomear tabelas ou colunas do banco (mudança de schema tem custo próprio e
depende de `add-products-schema-migration`), e reescrever a arquitetura dos módulos herdados.

## Capabilities

### Added Capabilities
- `mart-identity`: o repositório passa a se descrever como o que é — a API do Gwan Mart — em
  vocabulário, exemplos, scripts e configuração.

## Impact

- **DTOs e controllers** (`src/auth/dto`, `src/shared/presentation/dtos`, `src/chat/dtos`,
  `src/whatsapp-webhook`): textos e exemplos.
- **`package.json`**: `test:bdd` corrigido ou removido.
- **`src/database/seeder.ts`**: e-mails do domínio canônico.
- **`.env.example`**: porta e nomes do Mart.
- **Compatibilidade**: mudar valor de papel afeta autorização — precisa de migração de dados
  ou de aceitar os dois valores durante a transição.
