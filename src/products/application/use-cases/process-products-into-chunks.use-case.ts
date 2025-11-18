import { Injectable } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import { UseCase } from '@/shared/domain/use-case.interface';

@Injectable()
export class ProcessProductsIntoChunksUseCase
  implements UseCase<Product[], any[]>
{
  constructor() {}

  async execute(products: Product[]): Promise<any[]> {
    const chunks = [];

    for (const product of products) {
      // Gerar texto estruturado para busca vetorial/RAG
      const structuredText = this.generateStructuredText(product);

      const chunk = {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        structuredText: structuredText,
        metadata: {
          // Informações básicas
          category: product.category,
          subcategory: product.subcategory,
          supplier: product.supplier,
          isActive: product.isActive,
          isFeatured: product.isFeatured,

          // Preços
          originalPrice: product.originalPrice,
          promotionalPrice: product.promotionalPrice,
          costPrice: product.costPrice,
          discountPercentage: product.discountPercentage,

          // Estoque e disponibilidade
          stock: product.stock,

          // Avaliações
          averageRating: product.averageRating,
          totalReviews: product.totalReviews,

          // Identificação
          ncm: product.ncm,
          gtinEan: product.gtinEan,
          gtinEanPackage: product.gtinEanPackage,

          // Imagens
          realImage: product.realImage,
          thumbnail: product.thumbnail,
          images:
            product.images && product.images.length > 0
              ? product.images.map(img => ({
                  url: img.url,
                  alt: img.alt,
                  order: img.order,
                  isActive: img.isActive,
                }))
              : [],

          // Variações
          variations: product.variations,

          // Datas
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          deletedAt: product.deletedAt,
        },
        embeddingData: {
          text: structuredText,
          type: 'product_catalog',
          source: 'gwan_backend',
          timestamp: new Date().toISOString(),
        },
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  private generateStructuredText(product: Product): string {
    // Gerar texto estruturado para busca vetorial/RAG
    const structuredText = `PRODUTO: ${product.name}

INFORMAÇÕES BÁSICAS:
- Código: ${product.code}
- Categoria: ${product.category}
- Subcategoria: ${product.subcategory}
- Fornecedor: ${product.supplier}
- Status: ${product.isActive ? 'Ativo' : 'Inativo'}
- Destaque: ${product.isFeatured ? 'Sim' : 'Não'}

IDENTIFICAÇÃO:
- NCM: ${product.ncm}
- GTIN/EAN: ${product.gtinEan}
- GTIN/EAN Pacote: ${product.gtinEanPackage}

PREÇOS E FINANCEIRO:
- Preço Original: R$ ${product.originalPrice}
- Preço Promocional: R$ ${product.promotionalPrice || 'Não aplicável'}
- Preço de Custo: R$ ${product.costPrice}
- Desconto: ${product.discountPercentage}%

ESTOQUE E DISPONIBILIDADE:
- Estoque: ${product.stock} unidades
- Disponível: ${product.stock > 0 ? 'Sim' : 'Não'}

AVALIAÇÕES:
- Avaliação Média: ${product.averageRating}
- Total de Avaliações: ${product.totalReviews}

DESCRIÇÕES:
- Descrição: ${product.description}
- Descrição do Fornecedor: ${product.supplierProductDescription}

IMAGENS:
- Imagem Principal: ${product.realImage}
- Thumbnail: ${product.thumbnail}
- Imagens Adicionais: ${product.images && product.images.length > 0 ? product.images.map(img => img.url).join(', ') : 'Nenhuma imagem adicional'}

VARIAÇÕES:
${product.variations ? JSON.stringify(product.variations) : 'Nenhuma variação disponível'}

DATAS:
- Criado em: ${product.createdAt}
- Atualizado em: ${product.updatedAt}
${product.deletedAt ? `- Deletado em: ${product.deletedAt}` : ''}

PALAVRAS-CHAVE: ${product.name}, ${product.category}, ${product.subcategory}, ${product.supplier}, ${product.code}, ${product.ncm}`;

    return structuredText;
  }
}
