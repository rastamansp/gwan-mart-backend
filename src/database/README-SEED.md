# Seed de Produtos

Este script cria 5 produtos de exemplo com imagens para facilitar os testes da aplicação.

## Produtos Criados

1. **Smartphone Galaxy Pro Max** - Smartphone premium com tela AMOLED
2. **Notebook Gamer Ultra** - Notebook gamer de alta performance
3. **Fone de Ouvido Bluetooth Premium** - Fone com cancelamento de ruído
4. **Smartwatch Fitness Pro** - Relógio inteligente com GPS
5. **Tablet Ultra HD 10.5"** - Tablet com suporte para caneta digital

## Como Executar

### Pré-requisitos

1. Certifique-se de que o banco de dados está configurado e acessível
2. Verifique se a variável `DATABASE_URL` está configurada no arquivo `.env`

### Executar o Seed

```bash
npm run db:seed:products
```

Ou diretamente com ts-node:

```bash
npx ts-node -r tsconfig-paths/register src/database/seed-products.ts
```

## Comportamento

- O script verifica se já existem produtos no banco
- Se existirem produtos, o seed será pulado para evitar duplicação
- Cada produto é criado com 3 imagens de exemplo (URLs do Unsplash)
- Os produtos incluem todos os campos necessários: preços, estoque, categorias, etc.

## Limpar Produtos Antes de Reexecutar

Se você quiser recriar os produtos, você pode:

1. Deletar os produtos manualmente via API ou banco de dados
2. Ou usar um banco de dados limpo/teste

## Estrutura dos Dados

Cada produto inclui:
- Informações básicas (código, nome, descrição)
- Dados fiscais (NCM, GTIN/EAN)
- Preços (original, promocional, desconto)
- Estoque e fornecedor
- Categorias e subcategorias
- Imagens (thumbnail, realImage, galeria)
- Avaliações e reviews
- Status (ativo, destaque)

## Notas

- As imagens usam URLs do Unsplash (serviço de imagens gratuitas)
- Os produtos são criados como ativos por padrão
- 3 produtos são marcados como "destaque" (featured)
- Os preços e estoques são valores de exemplo

