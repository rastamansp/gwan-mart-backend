import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseType, FormattedResponse } from '../../interfaces/chat-response.interface';
import { PaginationService } from './pagination.service';
import { SuggestionsService } from '../suggestions.service';
import { ILogger } from '../../../shared/application/interfaces/logger.interface';
import { buildProductUrl } from './product-url';

@Injectable()
export class WebFormatterService {
  private readonly defaultEventLimit = 5; // Limite padrão de eventos para listar
  private readonly productUrl: (code: string) => string;

  constructor(
    private readonly paginationService: PaginationService,
    private readonly suggestionsService: SuggestionsService,
    private readonly configService: ConfigService,
    @Inject('ILogger')
    private readonly logger: ILogger,
  ) {
    // Default = site institucional (gwan-ia), que hospeda a area /gwan-mart.
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://gwan.cloud';
    const productPath =
      this.configService.get<string>('FRONTEND_PRODUCT_PATH') ||
      'gwan-mart/product';
    this.productUrl = (code: string) =>
      buildProductUrl(frontendUrl, productPath, code);
  }

  /**
   * Formata resposta para Web (retorna JSON estruturado)
   */
  async format(rawResponse: string, toolsUsed: { name: string; arguments?: Record<string, unknown> }[], rawData?: any): Promise<FormattedResponse> {
    const responseType = this.detectResponseType(toolsUsed);
    
    try {
      switch (responseType) {
        case 'product_list':
          return this.formatProductList(rawResponse, rawData, toolsUsed);
        
        case 'product_detail':
          return this.formatProductDetail(rawResponse, rawData, toolsUsed);
        
        default:
          return this.formatGeneric(rawResponse, toolsUsed);
      }
    } catch (error) {
      this.logger.error('Erro ao formatar resposta para Web', {
        error: error instanceof Error ? error.message : String(error),
        responseType,
      });
      return this.formatGeneric(rawResponse, toolsUsed);
    }
  }

  private detectResponseType(toolsUsed: { name: string; arguments?: Record<string, unknown> }[]): ResponseType {
    if (!toolsUsed || toolsUsed.length === 0) {
      return 'generic';
    }

    const lastTool = toolsUsed[toolsUsed.length - 1].name.toLowerCase();
    
    if (lastTool.includes('list_products')) {
      return 'product_list';
    }
    
    if (lastTool.includes('get_product_by_code') || lastTool.includes('product_detail')) {
      return 'product_detail';
    }
    
    return 'generic';
  }

  private formatProductList(rawResponse: string, rawData: any, toolsUsed: any[]): FormattedResponse {
    // Log debug: estrutura completa do rawData
    this.logger.debug('[WebFormatter] formatProductList - rawData structure', {
      rawDataType: typeof rawData,
      rawDataKeys: rawData ? Object.keys(rawData) : [],
      hasData: !!rawData?.data,
      dataKeys: rawData?.data ? Object.keys(rawData.data) : [],
      hasDataProducts: !!rawData?.data?.products,
      hasDataDataProducts: !!rawData?.data?.data?.products,
      hasProducts: !!rawData?.products,
      isArray: Array.isArray(rawData),
      rawDataPreview: rawData ? JSON.stringify(rawData).substring(0, 500) : 'null',
    });

    // Extrair produtos da resposta
    // O extractRawDataFromToolResults pode retornar um array: [{products: [...], total: ..., totalPages: ...}]
    // Ou um objeto: { status: "success", data: { products: [...] } }
    let products: any[] = [];
    let dataSource: any = null;
    
    // Se rawData é um array, pegar o primeiro elemento
    if (Array.isArray(rawData) && rawData.length > 0) {
      dataSource = rawData[0];
      this.logger.debug('[WebFormatter] formatProductList - rawData is array, using first element', {
        firstElementKeys: Object.keys(dataSource),
        hasProducts: !!dataSource?.products,
      });
    } else {
      dataSource = rawData;
    }
    
    // Tentar extrair produtos de várias estruturas possíveis
    if (dataSource?.data?.products && Array.isArray(dataSource.data.products)) {
      products = dataSource.data.products;
      this.logger.debug('[WebFormatter] formatProductList - Found products in dataSource.data.products', {
        count: products.length,
        firstProduct: products[0] ? {
          id: products[0].id,
          code: products[0].code,
          name: products[0].name,
          category: products[0].category,
        } : null,
      });
    } else if (dataSource?.products && Array.isArray(dataSource.products)) {
      products = dataSource.products;
      this.logger.debug('[WebFormatter] formatProductList - Found products in dataSource.products', {
        count: products.length,
        firstProduct: products[0] ? {
          id: products[0].id,
          code: products[0].code,
          name: products[0].name,
          category: products[0].category,
        } : null,
      });
    } else if (dataSource?.data?.data?.products && Array.isArray(dataSource.data.data.products)) {
      products = dataSource.data.data.products;
      this.logger.debug('[WebFormatter] formatProductList - Found products in dataSource.data.data.products', {
        count: products.length,
        firstProduct: products[0] ? {
          id: products[0].id,
          code: products[0].code,
          name: products[0].name,
          category: products[0].category,
        } : null,
      });
    } else {
      this.logger.warn('[WebFormatter] formatProductList - No products found in rawData', {
        rawDataStructure: rawData ? JSON.stringify(rawData).substring(0, 1000) : 'null',
        dataSourceKeys: dataSource ? Object.keys(dataSource) : [],
      });
    }

    // Extrair dados de paginação
    // Pode estar em rawData[0] se for array, ou em rawData.data
    const paginationData = (Array.isArray(rawData) && rawData[0]) ? rawData[0] : (rawData?.data || rawData || {});
    
    // Total real de produtos no banco (não apenas os retornados)
    const total = paginationData.total || products.length;
    const totalPages = paginationData.totalPages || 1;
    const page = paginationData.page || 1;
    
    // O pageSize deve ser o número real de produtos retornados, não o limit solicitado
    // Isso garante que se limit=5 foi aplicado, pageSize será 5
    const pageSize = products.length;
    
    const pagination = {
      page,
      limit: paginationData.limit || pageSize, // Limit original da requisição
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    // Não precisa paginar novamente, os produtos já vêm paginados da API
    const paginatedProducts = products;

    // Gerar Markdown formatado
    const markdownAnswer = this.generateProductListMarkdown(paginatedProducts, pagination.total || products.length);

    // Otimizar dados para listagem
    this.logger.debug('[WebFormatter] formatProductList - Before mapping products', {
      paginatedProductsCount: paginatedProducts.length,
      firstProductBeforeMapping: paginatedProducts[0] ? {
        id: paginatedProducts[0].id,
        code: paginatedProducts[0].code,
        name: paginatedProducts[0].name,
        category: paginatedProducts[0].category,
        originalPrice: paginatedProducts[0].originalPrice,
        originalPriceType: typeof paginatedProducts[0].originalPrice,
      } : null,
    });

    const optimizedProducts = paginatedProducts.map((p: any) => {
      const optimized = {
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description?.substring(0, 200) || null,
        category: p.category,
        subcategory: p.subcategory,
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        promotionalPrice: p.promotionalPrice ? Number(p.promotionalPrice) : null,
        discountPercentage: p.discountPercentage || 0,
        stock: p.stock || 0,
        thumbnail: p.thumbnail || null,
        realImage: p.realImage || null,
        averageRating: Number(p.averageRating) || 0,
        totalReviews: p.totalReviews || 0,
        isFeatured: p.isFeatured || false,
        url: this.productUrl(p.code),
      };
      
      // Log se algum campo importante estiver faltando
      if (!optimized.name || !optimized.code) {
        this.logger.warn('[WebFormatter] formatProductList - Product missing important fields', {
          productId: p.id,
          hasName: !!p.name,
          hasCode: !!p.code,
          productKeys: Object.keys(p),
          productPreview: JSON.stringify(p).substring(0, 300),
        });
      }
      
      return optimized;
    });

    this.logger.debug('[WebFormatter] formatProductList - After mapping products', {
      optimizedProductsCount: optimizedProducts.length,
      firstProductAfterMapping: optimizedProducts[0] ? {
        id: optimizedProducts[0].id,
        code: optimizedProducts[0].code,
        name: optimizedProducts[0].name,
        category: optimizedProducts[0].category,
      } : null,
    });

    const suggestions = this.suggestionsService.generateContextualSuggestions('product_list', { products: paginatedProducts });

    return {
      answer: markdownAnswer,
      data: {
        type: 'product_list',
        items: optimizedProducts,
        pagination: {
          current: pagination.page || 1,
          total: pagination.total, // Total real de produtos no banco
          pageSize: pageSize, // Número real de produtos retornados nesta página
          hasMore: pagination.hasNext || false,
        },
        suggestions,
      },
      media: optimizedProducts
        .filter((p: any) => p.thumbnail || p.realImage)
        .map((p: any) => ({
          type: 'image' as const,
          url: p.realImage || p.thumbnail,
          caption: p.name,
        })),
    };
  }

  private generateProductListMarkdown(products: any[], totalCount: number): string {
    if (products.length === 0) {
      return 'Não há produtos cadastrados no momento.';
    }

    let markdown = `## 🛍️ Produtos Encontrados (${totalCount})\n\n`;

    products.forEach((p: any, index: number) => {
      const originalPrice = p.originalPrice ? `**R$ ${Number(p.originalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**` : 'Preço sob consulta';
      const promotionalPrice = p.promotionalPrice ? `**R$ ${Number(p.promotionalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**` : null;
      const discount = p.discountPercentage > 0 ? ` (${p.discountPercentage}% OFF)` : '';
      
      markdown += `### ${index + 1}. ${p.name || 'Produto sem nome'}\n\n`;
      markdown += `- **Código:** ${p.code || 'N/A'}\n`;
      markdown += `- **Categoria:** ${p.category || 'N/A'}${p.subcategory ? ` - ${p.subcategory}` : ''}\n`;
      if (promotionalPrice) {
        markdown += `- **Preço:** ~~${originalPrice}~~ ${promotionalPrice}${discount}\n`;
      } else {
        markdown += `- **Preço:** ${originalPrice}\n`;
      }
      if (p.stock !== undefined) {
        markdown += `- **Estoque:** ${p.stock} unidades\n`;
      }
      const rating = Number(p.averageRating) || 0;
      if (rating > 0) {
        markdown += `- **Avaliação:** ⭐ ${rating.toFixed(1)} (${p.totalReviews || 0} avaliações)\n`;
      }
      if (p.description) {
        const desc = p.description.length > 150 ? p.description.substring(0, 150) + '...' : p.description;
        markdown += `- **Descrição:** ${desc}\n`;
      }
      
      if (p.thumbnail || p.realImage) {
        markdown += `\n![${p.name || 'Produto'}](${p.realImage || p.thumbnail})\n`;
      }
      
      markdown += `\n[Ver detalhes](${this.productUrl(p.code)})\n\n`;
      markdown += '---\n\n';
    });

    if (totalCount > products.length) {
      markdown += `\n*Mostrando ${products.length} de ${totalCount} produtos*\n`;
    }

    return markdown;
  }

  private formatProductDetail(rawResponse: string, rawData: any, toolsUsed: any[]): FormattedResponse {
    // Log debug: estrutura completa do rawData
    this.logger.debug('[WebFormatter] formatProductDetail - rawData structure', {
      rawDataType: typeof rawData,
      rawDataKeys: rawData ? Object.keys(rawData) : [],
      hasData: !!rawData?.data,
      dataKeys: rawData?.data ? Object.keys(rawData.data) : [],
      hasProduct: !!rawData?.product,
      isArray: Array.isArray(rawData),
      rawDataPreview: rawData ? JSON.stringify(rawData).substring(0, 500) : 'null',
    });

    // Extrair produto da resposta
    // A API retorna { status: "success", data: { ...product } }
    // O MCP controller retorna result.data diretamente, então rawData = { status: "success", data: { ...product } }
    const product = rawData?.data || rawData?.product || (Array.isArray(rawData) ? rawData[0] : rawData);
    
    this.logger.debug('[WebFormatter] formatProductDetail - Extracted product', {
      hasProduct: !!product,
      productKeys: product ? Object.keys(product) : [],
      productId: product?.id,
      productCode: product?.code,
      productName: product?.name,
      productPreview: product ? JSON.stringify(product).substring(0, 500) : 'null',
    });
    
    if (!product) {
      this.logger.warn('[WebFormatter] formatProductDetail - No product found, using generic format');
      return this.formatGeneric(rawResponse, toolsUsed);
    }

    // Gerar Markdown formatado
    const markdownAnswer = this.generateProductDetailMarkdown(product);

    // Objeto completo do produto
    const completeProduct = {
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description || null,
      category: product.category,
      subcategory: product.subcategory,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
      discountPercentage: product.discountPercentage || 0,
      stock: product.stock || 0,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      supplier: product.supplier || null,
      ncm: product.ncm || null,
      gtinEan: product.gtinEan || null,
      averageRating: Number(product.averageRating) || 0,
      totalReviews: product.totalReviews || 0,
      thumbnail: product.thumbnail || null,
      realImage: product.realImage || null,
      images: product.images || [],
      isActive: product.isActive !== undefined ? product.isActive : true,
      isFeatured: product.isFeatured || false,
      variations: product.variations || null,
      createdAt: product.createdAt || null,
      updatedAt: product.updatedAt || null,
      priceFormatted: product.promotionalPrice 
        ? `R$ ${Number(product.promotionalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : product.originalPrice 
          ? `R$ ${Number(product.originalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : null,
      url: this.productUrl(product.code),
    };

    const suggestions = this.suggestionsService.generateContextualSuggestions('product_detail', completeProduct);

    // Preparar mídia
    const media: Array<{ type: 'image'; url: string; caption?: string }> = [];
    if (completeProduct.realImage) {
      media.push({
        type: 'image',
        url: completeProduct.realImage,
        caption: completeProduct.name,
      });
    }
    if (Array.isArray(completeProduct.images) && completeProduct.images.length > 0) {
      completeProduct.images.forEach((img: any) => {
        if (img.url && img.url !== completeProduct.realImage) {
          media.push({
            type: 'image',
            url: img.url,
            caption: `${completeProduct.name} - Imagem ${media.length}`,
          });
        }
      });
    }

    return {
      answer: markdownAnswer,
      data: {
        type: 'product_detail',
        items: [completeProduct],
        suggestions,
        rawData: product,
      },
      media: media.length > 0 ? media : undefined,
    };
  }

  private generateProductDetailMarkdown(product: any): string {
    const originalPrice = product.originalPrice ? `**R$ ${Number(product.originalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**` : 'Preço sob consulta';
    const promotionalPrice = product.promotionalPrice ? `**R$ ${Number(product.promotionalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**` : null;
    const discount = product.discountPercentage > 0 ? ` (${product.discountPercentage}% OFF)` : '';
    
    let markdown = `# ${product.name || 'Produto'}\n\n`;
    
    // Imagem principal
    if (product.realImage || product.thumbnail) {
      markdown += `![${product.name || 'Produto'}](${product.realImage || product.thumbnail})\n\n`;
    }
    
    markdown += `## 📋 Informações Básicas\n\n`;
    markdown += `- **Código:** ${product.code || 'N/A'}\n`;
    markdown += `- **Categoria:** ${product.category || 'N/A'}${product.subcategory ? ` - ${product.subcategory}` : ''}\n`;
    if (promotionalPrice) {
      markdown += `- **Preço:** ~~${originalPrice}~~ ${promotionalPrice}${discount}\n`;
    } else {
      markdown += `- **Preço:** ${originalPrice}\n`;
    }
    if (product.stock !== undefined) {
      const stockStatus = product.stock > 0 ? `✅ ${product.stock} unidades disponíveis` : '❌ Fora de estoque';
      markdown += `- **Estoque:** ${stockStatus}\n`;
    }
    const rating = Number(product.averageRating) || 0;
    if (rating > 0) {
      markdown += `- **Avaliação:** ⭐ ${rating.toFixed(1)} (${product.totalReviews || 0} avaliações)\n`;
    }
    if (product.supplier) {
      markdown += `- **Fornecedor:** ${product.supplier}\n`;
    }
    
    // Descrição
    if (product.description) {
      markdown += `\n## 📝 Descrição\n\n`;
      markdown += `${product.description}\n\n`;
    }
    
    // Galeria de imagens
    if (Array.isArray(product.images) && product.images.length > 0) {
      markdown += `## 🖼️ Galeria de Imagens\n\n`;
      product.images.forEach((img: any, index: number) => {
        if (img.url) {
          markdown += `![Imagem ${index + 1}](${img.url})\n\n`;
        }
      });
    }
    
    // Link
    markdown += `\n[Ver no site](${this.productUrl(product.code)})\n`;

    return markdown;
  }

  private formatGeneric(rawResponse: string, toolsUsed: any[]): FormattedResponse {
    const suggestions = this.suggestionsService.generateSuggestions('generic');
    
    return {
      answer: rawResponse,
      data: {
        type: 'generic',
        suggestions,
      },
    };
  }
}
