# Tasks — fix-semantic-search-without-embedding

## 1. Provedor de embedding

- [x] 1.1 `IEmbeddingService.isConfigured()` e estado da última chamada (`getStatus()`), atualizado em sucesso e falha de `generateEmbedding`

## 2. Busca

- [x] 2.1 `searchByText(term, limit)` no repositório: nome, código, categoria e subcategoria; caixa e acento ignorados com `lower()` + `translate()` (sem extensão nem migration); curingas do termo escapados; só produtos ativos. A frase é quebrada em palavras (a caixa pede descrição, e a frase inteira como substring não casava com nada): basta uma casar, quem casa mais vem antes, casar no nome desempata
- [x] 2.2 `SearchProductsUseCase`: semântico com chave, textual sem chave, textual com log quando o provedor falha; resposta com `mode` e `fallbackReason` (`embedding-not-configured` | `semantic-search-failed`), `similarity: null` no textual; o textual não expõe `costPrice`/`supplier`
- [x] 2.3 Controller de `POST /products/search/similar` delega ao use case; Swagger documenta `mode`; query vazia ou acima de 500 caracteres vira 400 (antes era 500), `limit` limitado a 1–50

## 3. Health

- [x] 3.1 Entrada `embeddings` em `dependencies`: `disabled` sem chave (não rebaixa), `down` não crítica após falha (→ `degraded`), `up` caso contrário — sem chamar o provedor

## 4. Loja

- [x] 4.1 `searchSimilarProducts` tipa `mode`/`similarity: number | null`
- [x] 4.2 `CatalogPage`: no modo textual, sem percentual e com aviso — validado por build/tipos; NÃO conferido em navegador (o Playwright da máquina estava em uso por outra sessão)

## 5. Validação

- [x] 5.1 Teste automatizado do use case: sem chave, provedor falhando, provedor ok, banco fora continua subindo
- [x] 5.2 Teste do health: `disabled` não rebaixa, `down` degrada; teste do `EmbeddingService`: falha registrada e limpa no sucesso
- [x] 5.3 API local sem `OPENAI_API_KEY`: busca responde 2xx em modo textual ("audio" → Áudio, "eletronicos" → Eletrônicos, "fone bluetooth", "PROD-002"), health `ok` com `embeddings: disabled`
- [x] 5.4 API local com chave inválida: busca responde 2xx em modo textual com WARN no log; health `degraded` (200) com o erro do provedor
- [x] 5.5 `npm run lint`, `npm run build`, `npm test` (23 testes); `npm run build` em `web/`. `npm run lint` em `web/` falha com 14 erros `no-undef` (`window`, `React`, `RequestInit`) que já existiam antes desta change — configuração de ambiente do ESLint, nenhum introduzido aqui
