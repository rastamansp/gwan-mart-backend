import { Injectable, Inject } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import { ProductChunk } from '../../domain/entities/product-chunk.entity';
import { OpenAIService } from '@/shared/infrastructure/services/openai.service';
import { IProductChunkRepository } from '../../infrastructure/repositories/typeorm-product-chunk.repository';
import { UseCase } from '@/shared/domain/use-case.interface';

@Injectable()
export class ProcessAndSaveProductsToVectorDBUseCase
  implements UseCase<Product[], { saved: number; errors: any[] }>
{
  constructor(
    private readonly openaiService: OpenAIService,
    @Inject('IProductChunkRepository')
    private readonly chunkRepository: IProductChunkRepository,
  ) {}

  async execute(
    products: Product[],
  ): Promise<{ saved: number; errors: any[] }> {
    const errors: any[] = [];
    let saved = 0;

    // Limpar todos os chunks existentes antes de processar novos produtos
    console.log('Limpando chunks existentes da tabela product_chunks...');
    await this.chunkRepository.deleteAll();
    console.log('Chunks existentes removidos com sucesso.');

    // Processar produtos em lotes para otimizar performance
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      try {
        // Gerar textos estruturados para o lote
        const structuredTexts = batch.map(product =>
          this.generateStructuredText(product),
        );

        // Gerar embeddings para o lote
        const embeddings =
          await this.openaiService.generateEmbeddings(structuredTexts);

        // Criar chunks para o lote
        const chunks = batch.map((product, index) => {
          const chunk = new ProductChunk();
          chunk.productId = product.id;
          chunk.productCode = product.code;
          chunk.productName = product.name;
          chunk.structuredText = structuredTexts[index];
          chunk.setEmbeddingVector(embeddings[index]); // Usar método helper
          chunk.metadata = {
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
          };
          chunk.type = 'product_catalog';
          chunk.source = 'gwan_backend';
          return chunk;
        });

        // Salvar chunks no banco vetorial
        await this.chunkRepository.saveMany(chunks);
        saved += chunks.length;
      } catch (error) {
        errors.push({
          batch: i,
          error: error.message,
          products: batch.map(p => ({ id: p.id, code: p.code })),
        });
      }
    }

    return { saved, errors };
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
