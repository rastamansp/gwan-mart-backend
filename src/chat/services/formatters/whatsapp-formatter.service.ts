import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageChannel } from '../../../shared/domain/value-objects/message-channel.enum';
import { ResponseType, FormattedResponse } from '../../interfaces/chat-response.interface';
import { PaginationService } from './pagination.service';
import { SuggestionsService } from '../suggestions.service';
import { ILogger } from '../../../shared/application/interfaces/logger.interface';

@Injectable()
export class WhatsAppFormatterService {
  private readonly maxMessageLength = 4000; // Limite seguro para WhatsApp
  private readonly maxCaptionLength = 1024; // Limite de caption no WhatsApp
  private readonly defaultEventLimit = 5; // Limite padrão de eventos para listar
  private readonly frontendUrl: string;

  constructor(
    private readonly paginationService: PaginationService,
    private readonly suggestionsService: SuggestionsService,
    private readonly configService: ConfigService,
    @Inject('ILogger')
    private readonly logger: ILogger,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://mart.gwan.com.br/';
  }

  /**
   * Formata resposta para WhatsApp
   */
  async format(rawResponse: string, toolsUsed: { name: string; arguments?: Record<string, unknown> }[], rawData?: any): Promise<FormattedResponse> {
    const responseType = this.detectResponseType(toolsUsed);
    
    try {
      switch (responseType) {
        case 'product_list':
          return await this.formatProductList(rawResponse, rawData, toolsUsed);
        
        case 'product_detail':
          return await this.formatProductDetail(rawResponse, rawData, toolsUsed);
        
        default:
          return this.formatGeneric(rawResponse, toolsUsed);
      }
    } catch (error) {
      this.logger.error('Erro ao formatar resposta para WhatsApp', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        responseType,
        rawData: rawData ? JSON.stringify(rawData).substring(0, 500) : 'null',
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

  private formatGeneric(rawResponse: string, toolsUsed: any[]): FormattedResponse {
    return {
      answer: rawResponse,
      data: {
        type: 'generic',
      },
    };
  }

  private async formatProductList(rawResponse: string, rawData: any, toolsUsed: any[]): Promise<FormattedResponse> {
    // Log debug: estrutura completa do rawData
    this.logger.debug('[WhatsAppFormatter] formatProductList - rawData structure', {
      rawDataType: typeof rawData,
      rawDataKeys: rawData ? Object.keys(rawData) : [],
      hasData: !!rawData?.data,
      dataKeys: rawData?.data ? Object.keys(rawData.data) : [],
      hasDataProducts: !!rawData?.data?.products,
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
      this.logger.debug('[WhatsAppFormatter] formatProductList - rawData is array, using first element', {
        firstElementKeys: Object.keys(dataSource),
        hasProducts: !!dataSource?.products,
      });
    } else {
      dataSource = rawData;
    }
    
    // Tentar extrair produtos de várias estruturas possíveis
    if (dataSource?.data?.products && Array.isArray(dataSource.data.products)) {
      products = dataSource.data.products;
      this.logger.debug('[WhatsAppFormatter] formatProductList - Found products in dataSource.data.products', {
        count: products.length,
        firstProduct: products[0] ? {
          id: products[0].id,
          code: products[0].code,
          name: products[0].name,
        } : null,
      });
    } else if (dataSource?.products && Array.isArray(dataSource.products)) {
      products = dataSource.products;
      this.logger.debug('[WhatsAppFormatter] formatProductList - Found products in dataSource.products', {
        count: products.length,
        firstProduct: products[0] ? {
          id: products[0].id,
          code: products[0].code,
          name: products[0].name,
        } : null,
      });
    } else {
      this.logger.warn('[WhatsAppFormatter] formatProductList - No products found in rawData', {
        rawDataStructure: rawData ? JSON.stringify(rawData).substring(0, 1000) : 'null',
        dataSourceKeys: dataSource ? Object.keys(dataSource) : [],
      });
    }

    // Limitar quantidade de produtos para WhatsApp
    const limitedProducts = products.slice(0, this.defaultEventLimit);
    
    if (limitedProducts.length === 0) {
      return {
        answer: '❌ Não encontrei produtos cadastrados no momento.',
        data: {
          type: 'product_list',
          items: [],
        },
      };
    }

    // Formatar lista de produtos
    let message = `🛍️ *Encontrei ${products.length} produto(s):*\n\n`;
    
    limitedProducts.forEach((p: any, index: number) => {
      const originalPrice = p.originalPrice ? `R$ ${Number(p.originalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Preço sob consulta';
      const promotionalPrice = p.promotionalPrice ? `R$ ${Number(p.promotionalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
      const discount = p.discountPercentage > 0 ? ` (${p.discountPercentage}% OFF)` : '';
      const category = p.category || '';
      const subcategory = p.subcategory || '';
      
      message += `${index + 1}. *${p.name || 'Produto sem nome'}*\n`;
      message += `   Código: ${p.code || 'N/A'}\n`;
      if (category) {
        message += `   ${category}${subcategory ? ` - ${subcategory}` : ''}\n`;
      }
      if (promotionalPrice) {
        message += `   💰 ~~${originalPrice}~~ ${promotionalPrice}${discount}\n`;
      } else {
        message += `   💰 ${originalPrice}\n`;
      }
      if (p.stock !== undefined) {
        const stockStatus = p.stock > 0 ? `✅ ${p.stock} unidades` : '❌ Fora de estoque';
        message += `   📦 ${stockStatus}\n`;
      }
      const rating = Number(p.averageRating) || 0;
      if (rating > 0) {
        message += `   ⭐ ${rating.toFixed(1)} (${p.totalReviews || 0} avaliações)\n`;
      }
      
      message += `   🔗 ${this.frontendUrl}products/${p.code}\n\n`;
    });

    if (products.length > this.defaultEventLimit) {
      message += `\n_... e mais ${products.length - this.defaultEventLimit} produto(s)_`;
    }

    return {
      answer: message,
      data: {
        type: 'product_list',
        items: limitedProducts,
        rawData: products,
      },
    };
  }

  private async formatProductDetail(rawResponse: string, rawData: any, toolsUsed: any[]): Promise<FormattedResponse> {
    // Extrair produto da resposta
    // A API retorna { status: "success", data: { ...product } }
    // O MCP controller retorna result.data diretamente, então rawData = { status: "success", data: { ...product } }
    const product = rawData?.data || rawData?.product || (Array.isArray(rawData) ? rawData[0] : rawData);
    
    if (!product) {
      return this.formatGeneric(rawResponse, toolsUsed);
    }

    // Formatar detalhes completos do produto
    let message = `🛍️ *${product.name || 'Produto'}*\n\n`;
    
    const originalPrice = product.originalPrice ? `R$ ${Number(product.originalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Preço sob consulta';
    const promotionalPrice = product.promotionalPrice ? `R$ ${Number(product.promotionalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
    const discount = product.discountPercentage > 0 ? ` (${product.discountPercentage}% OFF)` : '';
    const category = product.category || '';
    const subcategory = product.subcategory || '';
    
    if (promotionalPrice) {
      message += `💰 *Preço:* ~~${originalPrice}~~ ${promotionalPrice}${discount}\n`;
    } else {
      message += `💰 *Preço:* ${originalPrice}\n`;
    }
    message += `📋 *Código:* ${product.code || 'N/A'}\n`;
    if (category) {
      message += `📂 *Categoria:* ${category}${subcategory ? ` - ${subcategory}` : ''}\n`;
    }
    
    // Estoque
    if (product.stock !== undefined) {
      const stockStatus = product.stock > 0 ? `✅ ${product.stock} unidades disponíveis` : '❌ Fora de estoque';
      message += `📦 *Estoque:* ${stockStatus}\n`;
    }
    
    // Avaliação
    const rating = Number(product.averageRating) || 0;
    if (rating > 0) {
      message += `⭐ *Avaliação:* ${rating.toFixed(1)} (${product.totalReviews || 0} avaliações)\n`;
    }
    
    // Fornecedor
    if (product.supplier) {
      message += `🏢 *Fornecedor:* ${product.supplier}\n`;
    }
    
    message += `\n`;
    
    // Descrição
    if (product.description) {
      const description = product.description.length > 300 
        ? product.description.substring(0, 300) + '...' 
        : product.description;
      message += `📝 *Descrição:*\n${description}\n\n`;
    }
    
    // Link
    message += `🔗 ${this.frontendUrl}products/${product.code}`;

    return {
      answer: message,
      data: {
        type: 'product_detail',
        items: [product],
        rawData: product,
      },
      media: (product.realImage || product.thumbnail) ? [{
        type: 'image' as const,
        url: product.realImage || product.thumbnail,
        caption: message.length > this.maxCaptionLength 
          ? message.substring(0, this.maxCaptionLength - 3) + '...' 
          : message,
      }] : undefined,
    };
  }
}
