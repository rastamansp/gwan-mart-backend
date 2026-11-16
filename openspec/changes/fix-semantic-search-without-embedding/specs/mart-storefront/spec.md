## ADDED Requirements

### Requirement: Loja distingue resultado semântico de textual
Quando a busca por similaridade devolver resultados em modo textual, a página de catálogo SHALL
exibi-los sem grau de similaridade e SHALL avisar que a busca por similaridade está
indisponível e os resultados são por texto. Este requisito substitui, para o caso de provedor
indisponível, o cenário "Recurso de similaridade indisponível no servidor" de
`port-storefront-features`: o servidor deixa de responder erro nesse caso.

#### Scenario: Servidor sem provedor de embedding
- **WHEN** o visitante usa a busca por similaridade e o servidor responde em modo textual
- **THEN** a loja lista os produtos encontrados, sem percentual, com o aviso de que a busca é textual

#### Scenario: Servidor com provedor de embedding
- **WHEN** o servidor responde em modo semântico
- **THEN** a loja mostra o grau de similaridade de cada produto, como antes
