# Tasks — port-storefront-features

## 1. Pedido por WhatsApp

- [x] 1.1 `lib/whatsapp.ts`: monta a mensagem (produto, código, quantidade, origem, CEP, variação, preço) e a URL `wa.me`
- [x] 1.2 Número de destino em `VITE_WHATSAPP_NUMBER`, documentado no `.env.example` — no institucional está no código
- [x] 1.3 Sem número configurado, a ação não é oferecida (nada de abrir conversa para número inválido)
- [x] 1.4 Controles na página de produto: quantidade (limitada ao estoque), origem do frete e CEP com máscara `00000-000`

## 2. Variações

- [x] 2.1 Ler `variations` tolerando ausente/`null` e formato inesperado (`productVariations()`). **Nao exercitado com dados reais**: o seed atual traz `variations: null` nos 5 produtos
- [x] 2.2 Escolha obrigatoria quando houver variacoes; indisponiveis nao sao selecionaveis (mesma ressalva de 2.1)
- [x] 2.3 Variacao escolhida entra na mensagem do pedido (mesma ressalva de 2.1)

## 3. Compartilhar

- [x] 3.1 Web Share API quando existir; cópia do link como alternativa
- [x] 3.2 Confirmação visível do resultado (aviso temporário), sem erro quando o visitante cancela

## 4. Ficha e avaliação

- [x] 4.1 Estrelas a partir de `averageRating`, com total de avaliações; produto sem avaliação não mostra nota zerada
- [x] 4.2 Ficha: código, NCM, GTIN/EAN, estoque, fornecedor, disponibilidade
- [x] 4.3 Selos de garantia, frete e suporte

## 5. Catálogo

- [x] 5.1 Filtro por subcategoria e escolha de itens por página, com estado na URL
- [x] 5.2 Lista de categorias/subcategorias derivada do catálogo real (a API não expõe endpoint próprio)
- [x] 5.3 Alternância entre busca comum e por similaridade, com o modo ativo visível
- [x] 5.4 Resultados de similaridade com o percentual de cada produto
- [x] 5.5 Tratamento distinto para `429` (teto de 10/min por IP) e para falha do provedor de embeddings

## 6. Validação

- [x] 6.1 `npm run build` sem erro de tipo
- [x] 6.2 Pedido pelo WhatsApp abre com a mensagem correta (conferir a URL gerada, sem enviar)
- [x] 6.3 Filtros e paginação refletidos na URL e recarregáveis
- [x] 6.4 Busca por similaridade sem `OPENAI_API_KEY` explica a indisponibilidade em vez de dizer "nenhum resultado"
- [x] 6.5 Navegação completa validada em browser real

## 7. Nao portado, de proposito

- [x] 7.1 As tres estatisticas da home do institucional ("500+ produtos vendidos", "1.2k+ clientes", "4.9 de media") ficaram de fora: sao numeros escritos no codigo, sem origem. Prova social fabricada numa loja e enganosa
