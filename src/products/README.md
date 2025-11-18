# Módulo de Produtos - GWAN Backend

Este módulo implementa o gerenciamento completo de produtos seguindo Clean Architecture, com operações CRUD, filtros avançados, paginação e sistema de imagens.

## 🎯 Visão Geral

O módulo de produtos oferece uma API completa para gerenciamento de produtos, incluindo:
- CRUD completo (Create, Read, Update, Delete)
- Sistema de filtros avançados
- Paginação e ordenação
- Produtos em destaque
- Sistema de imagens
- Busca por código único
- Autenticação JWT obrigatória para operações de escrita

## 🏗️ Arquitetura

### Estrutura do Módulo
```
src/modules/products/
├── domain/
│   ├── entities/
│   │   ├── product.entity.ts      # Entidade principal do produto
│   │   └── product-image.entity.ts # Entidade de imagens
│   └── repositories/
│       └── product.repository.interface.ts # Interface do repositório
├── application/
│   ├── dto/
│   │   └── product.dto.ts         # DTOs de entrada e saída
│   └── use-cases/
│       └── product.use-cases.ts   # Casos de uso implementados
├── infrastructure/
│   └── repositories/
│       └── typeorm-product.repository.ts # Implementação TypeORM
├── infra/
│   ├── products.controller.ts     # Controller REST
│   └── products.service.ts        # Serviço de aplicação
├── tests/
│   └── bdd/
│       └── features/
│           └── products-listing.feature # Testes BDD
└── products.module.ts             # Módulo NestJS
```

## 📡 Endpoints da API

### 1. Listar Produtos com Filtros
`GET /api/v1/products`

Lista produtos com filtros avançados, paginação e ordenação.

#### Query Parameters
- `category` (string, opcional): Categoria do produto
- `subcategory` (string, opcional): Subcategoria do produto
- `minPrice` (number, opcional): Preço mínimo
- `maxPrice` (number, opcional): Preço máximo
- `search` (string, opcional): Termo de busca
- `page` (number, opcional): Número da página (padrão: 1)
- `limit` (number, opcional): Itens por página (padrão: 10)
- `sortBy` (string, opcional): Campo para ordenação
- `sortOrder` (string, opcional): Ordem da ordenação (asc/desc)

#### Exemplo de Request
```bash
GET /api/v1/products?category=eletrônicos&minPrice=100&maxPrice=1000&page=1&limit=5
```

#### Response (200 OK)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Smartphone XYZ",
        "description": "Smartphone com tela de 6.1 polegadas",
        "price": 899.99,
        "category": "eletrônicos",
        "subcategory": "smartphones",
        "code": "SP001",
        "isActive": true,
        "isFeatured": false,
        "images": [
          {
            "id": 1,
            "url": "https://example.com/image1.jpg",
            "alt": "Imagem principal do produto"
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 25,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Listar Todos os Produtos
`GET /api/v1/products/all`

Lista todos os produtos sem filtros (para uso interno).

#### Response (200 OK)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "products": [...],
    "total": 25
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Produtos em Destaque
`GET /api/v1/products/featured`

Lista produtos marcados como destaque (máximo 10).

#### Response (200 OK)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "products": [...],
    "total": 8
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. Buscar Produto por Código
`GET /api/v1/products/:code`

Busca um produto pelo código único.

#### Response (200 OK)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "product": {
      "id": 1,
      "name": "Smartphone XYZ",
      "description": "Smartphone com tela de 6.1 polegadas",
      "price": 899.99,
      "category": "eletrônicos",
      "subcategory": "smartphones",
      "code": "SP001",
      "isActive": true,
      "isFeatured": false,
      "images": [...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Erros
- `404 Not Found`: Produto não encontrado

### 5. Criar Produto
`POST /api/v1/products` 🔒

Cria um novo produto (requer autenticação JWT).

#### Request Body
```json
{
  "code": "PROD-001",
  "description": "Produto de exemplo",
  "ncm": "12345678",
  "stock": 100,
  "costPrice": 10.50,
  "supplier": "Fornecedor ABC",
  "gtinEan": "1234567890123",
  "gtinEanPackage": "1234567890123",
  "supplierProductDescription": "Descrição do fornecedor",
  "thumbnail": "https://example.com/thumb.jpg",
  "category": "Eletrônicos",
  "subcategory": "Smartphones",
  "originalPrice": 15.00,
  "discountPercentage": 10,
  "realImage": "https://example.com/image.jpg",
  "name": "Produto Exemplo",
  "isActive": true,
  "isFeatured": false
}
```

### 6. Atualizar Catálogo do Produto
`POST /api/v1/products/catalog/update/:id` 🌐

Atualiza o catálogo de produtos processando todos os produtos e salvando chunks com embeddings no banco vetorial para busca vetorial/RAG.

#### Path Parameters
- `id` (number, obrigatório): ID único do produto (usado apenas para identificação da operação)

#### Exemplo de Request
```bash
POST /api/v1/products/catalog/update/123
```

#### Response (200 OK)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "message": "OK",
    "productId": 123,
    "totalProducts": 303,
    "vectorDBResult": {
      "saved": 303,
      "errors": 0,
      "errorDetails": []
    },
    "timestamp": "2025-09-24T00:04:17.372Z"
  },
  "timestamp": "2025-09-24T00:04:17.372Z"
}
```

#### Logs no Console
O endpoint registra logs detalhados no console:
```
[request-id] Iniciando atualização de catálogo para produto ID: 123
[request-id] Query executada com sucesso. Total de produtos encontrados: 303
[request-id] Produtos processados e salvos no banco vetorial. Total salvos: 303
```

#### Funcionalidades do Banco Vetorial

Cada produto é processado e salvo na tabela `product_chunks` contendo:

1. **Identificação do Produto**: ID, código e nome
2. **Texto Estruturado**: Informações organizadas para busca vetorial
3. **Embedding**: Vetor de 1536 dimensões gerado pela OpenAI
4. **Metadados**: Categoria, fornecedor, preços, estoque, status

#### Uso para Busca Vetorial/RAG

Os chunks são salvos no banco vetorial (`VECTOR_DATABASE_URL`) para:

- **Busca por similaridade**: Consultas usando embeddings da OpenAI
- **RAG (Retrieval-Augmented Generation)**: Recuperação de informações relevantes
- **Busca semântica**: Consultas inteligentes por características específicas
- **Recomendações**: Sugestões baseadas em similaridade de produtos

### 7. Buscar Produtos Similares
`POST /api/v1/products/search/similar` 🌐

Busca produtos similares usando embeddings e similaridade de cosseno.

#### Body Parameters
```json
{
  "query": "cartucho de toner HP preto",
  "limit": 5
}
```

#### Exemplo de Request
```bash
POST /api/v1/products/search/similar
Content-Type: application/json

{
  "query": "cartucho de toner HP preto",
  "limit": 5
}
```

#### Response (200 OK)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "query": "cartucho de toner HP preto",
    "results": [
      {
        "productId": 711,
        "productCode": "MAXPRINT-CF283A",
        "productName": "Cartucho de Toner Maxprint Cf283a Compatível com Hp - Preto",
        "similarity": 0.95,
        "metadata": {
          "category": "Eletrodomésticos",
          "subcategory": "Batedeiras",
          "supplier": "RIO BRANCO COM. E IND. DE PAPEIS LTDA",
          "price": "36.47",
          "stock": 48,
          "isActive": true,
          "isFeatured": false,
          "createdAt": "2025-09-18T01:22:18.989Z",
          "updatedAt": "2025-09-18T01:22:18.989Z"
        }
      }
    ],
    "totalResults": 5,
    "timestamp": "2025-09-24T00:04:17.372Z"
  },
  "timestamp": "2025-09-24T00:04:17.372Z"
}
```

#### Funcionalidades da Busca por Similaridade

- **Embedding da Query**: Gera vetor para a consulta usando OpenAI
- **Similaridade de Cosseno**: Calcula similaridade entre vetores
- **Ranking por Relevância**: Ordena resultados por score de similaridade
- **Metadados Completos**: Retorna informações detalhadas dos produtos similares

#### Exemplos de Consultas

- "cartucho de toner HP preto" → Produtos de toner HP
- "impressora laser" → Impressoras laser e acessórios
- "papel A4" → Papéis e materiais de escritório
- "smartphone Samsung" → Smartphones Samsung e acessórios

### 7. Importar Múltiplos Produtos
`POST /api/v1/products/import` 🌐

Importa múltiplos produtos de uma vez (sem autenticação).

#### Request Body
```json
[
  {
    "code": "PROD-001",
    "description": "Produto 1",
    "ncm": "12345678",
    "stock": 100,
    "costPrice": 10.50,
    "supplier": "Fornecedor ABC",
    "gtinEan": "1234567890123",
    "gtinEanPackage": "1234567890123",
    "supplierProductDescription": "Descrição do fornecedor",
    "thumbnail": "https://example.com/thumb1.jpg",
    "category": "Eletrônicos",
    "subcategory": "Smartphones",
    "originalPrice": 15.00,
    "discountPercentage": 10,
    "realImage": "https://example.com/image1.jpg",
    "name": "Produto 1",
    "isActive": true,
    "isFeatured": false
  },
  {
    "code": "PROD-002",
    "description": "Produto 2",
    "ncm": "87654321",
    "stock": 50,
    "costPrice": 20.00,
    "supplier": "Fornecedor XYZ",
    "gtinEan": "9876543210987",
    "gtinEanPackage": "9876543210987",
    "supplierProductDescription": "Descrição do fornecedor 2",
    "thumbnail": "https://example.com/thumb2.jpg",
    "category": "Eletrônicos",
    "subcategory": "Tablets",
    "originalPrice": 30.00,
    "discountPercentage": 5,
    "realImage": "https://example.com/image2.jpg",
    "name": "Produto 2",
    "isActive": true,
    "isFeatured": true
  }
]
```

#### Response (201 Created)
```json
{
  "status": "success",
  "data": {
    "total": 2,
    "success": 2,
    "errorCount": 0,
    "results": [
      {
        "index": 0,
        "product": {
          "id": "uuid-1",
          "code": "PROD-001",
          "name": "Produto 1"
        },
        "status": "success"
      },
      {
        "index": 1,
        "product": {
          "id": "uuid-2",
          "code": "PROD-002",
          "name": "Produto 2"
        },
        "status": "success"
      }
    ],
    "errors": []
  }
}
```

#### Response (201 Created)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "product": {
      "id": 1,
      "name": "Smartphone XYZ",
      "description": "Smartphone com tela de 6.1 polegadas",
      "price": 899.99,
      "category": "eletrônicos",
      "subcategory": "smartphones",
      "code": "SP001",
      "isActive": true,
      "isFeatured": false,
      "images": [...],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Erros
- `401 Unauthorized`: Token JWT inválido ou ausente
- `400 Bad Request`: Dados inválidos
- `409 Conflict`: Código do produto já existe

### 7. Atualizar Produto
`PUT /api/v1/products/:id` 🔒

Atualiza um produto existente (requer autenticação JWT).

#### Request Body
```json
{
  "name": "Smartphone XYZ Pro",
  "description": "Smartphone com tela de 6.1 polegadas - Versão Pro",
  "price": 999.99,
  "isFeatured": true
}
```

#### Response (200 OK)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "product": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Erros
- `401 Unauthorized`: Token JWT inválido ou ausente
- `404 Not Found`: Produto não encontrado
- `400 Bad Request`: Dados inválidos

### 8. Deletar Produto
`DELETE /api/v1/products/:id` 🔒

Remove um produto (requer autenticação JWT).

#### Response (200 OK)
```json
{
  "status": "success",
  "error": null,
  "data": {
    "message": "Produto deletado com sucesso"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Erros
- `401 Unauthorized`: Token JWT inválido ou ausente
- `404 Not Found`: Produto não encontrado

## 🗄️ Estrutura do Banco de Dados

### Tabela `products`
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  code VARCHAR(50) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela `product_images`
```sql
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  alt VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Casos de Uso Implementados

### 1. CreateProductUseCase
- Valida dados de entrada
- Verifica se código já existe
- Cria produto e imagens
- Retorna produto criado

### 2. GetProductByIdUseCase
- Busca produto por ID
- Inclui imagens relacionadas
- Retorna erro se não encontrado

### 3. GetProductByCodeUseCase
- Busca produto por código único
- Inclui imagens relacionadas
- Retorna erro se não encontrado

### 4. GetAllProductsUseCase
- Lista todos os produtos
- Inclui imagens relacionadas
- Retorna lista completa

### 5. UpdateProductUseCase
- Valida dados de entrada
- Atualiza produto existente
- Mantém imagens existentes
- Retorna produto atualizado

### 6. DeleteProductUseCase
- Remove produto e imagens relacionadas
- Confirma exclusão
- Retorna mensagem de sucesso

### 7. GetFeaturedProductsUseCase
- Lista produtos marcados como destaque
- Limita a 10 produtos
- Ordena por data de criação

### 8. GetProductsWithFiltersUseCase
- Aplica filtros avançados
- Implementa paginação
- Suporta ordenação
- Retorna resultado paginado

## 🧪 Testes BDD

### Feature: Gerenciamento de Produtos
```gherkin
Feature: Gerenciamento de Produtos
  Como um usuário do sistema
  Eu quero gerenciar produtos
  Para que eu possa criar, listar, atualizar e deletar produtos

  Scenario: Listar todos os produtos
    Given que existem produtos cadastrados no sistema
    When eu faço uma requisição GET para "/api/v1/products"
    Then a resposta deve ter status 200
    And a resposta deve conter uma lista de produtos
    And cada produto deve ter os campos obrigatórios

  Scenario: Buscar produto por ID
    Given que existe um produto com ID "1" cadastrado
    When eu faço uma requisição GET para "/api/v1/products/1"
    Then a resposta deve ter status 200
    And a resposta deve conter os dados do produto
    And o produto deve ter o ID "1"
```

### Execução dos Testes
```bash
# Executar testes BDD de produtos
pnpm run bdd

# Executar testes específicos
npx cucumber-js tests/bdd/features/products-listing.feature
```

## 🔒 Segurança

### Autenticação JWT
- **Operações de Leitura**: Públicas (GET)
- **Operações de Escrita**: Requerem JWT válido (POST, PUT, DELETE)
- **Header**: `Authorization: Bearer <token>`

### Validações
- **Nome**: String não vazia, máximo 255 caracteres
- **Preço**: Número positivo, máximo 2 casas decimais
- **Código**: String única, máximo 50 caracteres
- **Categoria/Subcategoria**: Strings opcionais, máximo 100 caracteres
- **Imagens**: URLs válidas, máximo 500 caracteres

## 📊 Monitoramento

### Métricas Coletadas
- `products_created_total` - Contador de produtos criados
- `products_updated_total` - Contador de produtos atualizados
- `products_deleted_total` - Contador de produtos deletados
- `products_listed_total` - Contador de listagens de produtos
- `product_search_duration_ms` - Tempo de busca de produtos

### Logs Estruturados
```json
{
  "level": "info",
  "message": "Product created successfully",
  "productId": 1,
  "productCode": "SP001",
  "userId": "user123",
  "requestId": "req456",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚀 Exemplos de Uso

### Fluxo Completo - Criar e Listar Produto

#### 1. Autenticar Usuário
```bash
# Primeiro, faça login para obter o token JWT
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@exemplo.com"}'

# Verificar código de login
curl -X POST http://localhost:3000/api/v1/auth/verify-account-code \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@exemplo.com", "code": "654321"}'
```

#### 2. Criar Produto
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seu-token-jwt>" \
  -d '{
    "name": "Smartphone XYZ",
    "description": "Smartphone com tela de 6.1 polegadas",
    "price": 899.99,
    "category": "eletrônicos",
    "subcategory": "smartphones",
    "code": "SP001",
    "isActive": true,
    "isFeatured": false,
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "alt": "Imagem principal do produto"
      }
    ]
  }'
```

#### 3. Listar Produtos
```bash
# Listar todos os produtos
curl http://localhost:3000/api/v1/products

# Listar com filtros
curl "http://localhost:3000/api/v1/products?category=eletrônicos&minPrice=500&maxPrice=1500&page=1&limit=5"

# Produtos em destaque
curl http://localhost:3000/api/v1/products/featured
```

#### 4. Buscar Produto Específico
```bash
# Por ID
curl http://localhost:3000/api/v1/products/1

# Por código
curl http://localhost:3000/api/v1/products/code/SP001
```

#### 5. Atualizar Produto
```bash
curl -X PUT http://localhost:3000/api/v1/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seu-token-jwt>" \
  -d '{
    "name": "Smartphone XYZ Pro",
    "price": 999.99,
    "isFeatured": true
  }'
```

#### 6. Deletar Produto
```bash
curl -X DELETE http://localhost:3000/api/v1/products/1 \
  -H "Authorization: Bearer <seu-token-jwt>"
```

## 📚 Considerações de Implementação

### Status Atual
- ✅ **CRUD Completo**: Todas as operações implementadas
- ✅ **Filtros Avançados**: Busca por categoria, preço, termo
- ✅ **Paginação**: Sistema completo de paginação
- ✅ **Sistema de Imagens**: Suporte a múltiplas imagens
- ✅ **Autenticação**: JWT obrigatório para operações de escrita
- ✅ **Validações**: Validação completa de dados
- ✅ **Testes BDD**: Testes automatizados implementados
- ✅ **Clean Architecture**: Estrutura bem organizada

### Próximos Passos
- 🔄 **Cache**: Implementar cache Redis para listagens
- 🔄 **Upload de Imagens**: Integração com MinIO
- 🔄 **Busca Full-Text**: Implementar busca avançada
- 🔄 **Categorias**: Sistema de categorias hierárquico
- 🔄 **Estoque**: Controle de estoque de produtos
- 🔄 **Reviews**: Sistema de avaliações
- 🔄 **Favoritos**: Sistema de produtos favoritos

## 🔗 Integrações

### Banco de Dados
- **PostgreSQL**: Banco principal com TypeORM
- **Extensão pgvector**: Para busca semântica (futuro)

### Serviços Externos
- **MinIO**: Upload de imagens (futuro)
- **Elasticsearch**: Busca avançada (futuro)

### Monitoramento
- **OpenTelemetry**: Traces e métricas
- **Pino Logger**: Logs estruturados
- **Jaeger**: Visualização de traces
- **Prometheus**: Coleta de métricas

---

**🎉 O módulo de produtos está completo e pronto para produção!**
