# Tasks — remove-imoveis-fork-residue

## 1. Inventário

- [x] 1.1 Listar as ocorrências de imóvel/propriedade/corretor em `src/` e classificar cada uma: texto, contrato de API, ou dado persistido
- [ ] 1.2 Separar o que é seguro trocar agora do que depende de migração de dados (papéis)

## 2. Suíte BDD

- [x] 2.1 `test:bdd` repontado para `src/chat/steps` + `src/chat/features` (os de `src/properties/` não existem)
- [ ] 2.2 Se mantida, garantir que a suíte roda de verdade e entra no CI (ver `align-production-stack-gwan`)

## 3. Vocabulário

- [x] 3.1 Exemplo do `ChatRequestDto` fala de produto; **restam** DTOs de auth/usuário e `src/chat/steps/chat-steps.ts` (tolerâncias BDD com "não há imóveis cadastrados")
- [ ] 3.2 Mensagens e comentários de domínio revisados nos módulos herdados
- [x] 3.3 Seeds usam `gwan.cloud` no lugar de `gwan.com.br`
- [x] 3.4 `.env.example` com a porta do slot 11 (hoje diz 3009, do imóveis) e nomes do Mart

## 4. Papéis

- [ ] 4.1 Definir o conjunto de papéis do Mart (mínimo: usuário e administrador de catálogo)
- [ ] 4.2 Plano de transição para tokens/registros com o papel antigo (aceitar ambos por um período ou migrar dados)
- [ ] 4.3 Alinhar com `secure-catalog-write-endpoints`, que depende de "quem é administrador"

## 5. Validação

- [ ] 5.1 `grep` por imóvel/propriedade/corretor em `src/` retorna apenas o que foi conscientemente mantido
- [ ] 5.2 Login e rotas autenticadas seguem funcionando com usuário existente
- [ ] 5.3 `/api` (Swagger) descreve o Mart de ponta a ponta

## 6. Feito fora do inventário original

- [x] 6.1 `chat.service.ts`: removidos os ramos `list_properties` e `get_property_by_id` do formatador de tool results — as tools do bot são geradas do OpenAPI desta API (só produtos), então eram código morto
- [x] 6.2 `user-credit-repository.interface.ts`: removido `Symbol` morto que colidia com a interface e quebrava o lint (injeção sempre foi pelo token string)
- [x] 6.3 Credenciais de produção hardcoded removidas de 4 scripts (ver change `secure-catalog-write-endpoints`)
