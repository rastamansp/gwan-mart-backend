import { Injectable } from '@nestjs/common';
import { ResponseType } from '../interfaces/chat-response.interface';

@Injectable()
export class SuggestionsService {
  /**
   * Gera sugestões de respostas baseadas no tipo de resposta
   */
  generateSuggestions(responseType: ResponseType, context?: any): string[] {
    switch (responseType) {
      case 'product_list':
        return [
          'Ver detalhes de um produto',
          'Filtrar por categoria',
          'Filtrar por preço',
          'Buscar produtos',
        ];

      case 'product_detail':
        return [
          'Ver outros produtos',
          'Buscar produtos similares',
          'Ver produtos da mesma categoria',
          'Listar todos os produtos',
        ];

      default:
        return [
          'Como posso ajudar?',
          'Ver produtos disponíveis',
          'Buscar produtos',
          'Ver categorias',
        ];
    }
  }

  /**
   * Gera sugestões contextuais baseadas em dados específicos
   */
  generateContextualSuggestions(responseType: ResponseType, data: any): string[] {
    const baseSuggestions = this.generateSuggestions(responseType, data);
    
    // Adicionar sugestões específicas baseadas nos dados
    if (responseType === 'product_list' && data?.products?.length > 0) {
      // Se houver produtos, adicionar sugestão para ver detalhes do primeiro
      if (data.products[0]?.code) {
        baseSuggestions.unshift(`Ver detalhes do produto "${data.products[0].name || data.products[0].code}"`);
      }
    } else if (responseType === 'product_list' && Array.isArray(data) && data.length > 0) {
      // Se data for um array direto de produtos
      if (data[0]?.code) {
        baseSuggestions.unshift(`Ver detalhes do produto "${data[0].name || data[0].code}"`);
      }
    } else if (responseType === 'product_detail' && data?.code) {
      // Se for detalhe de produto, adicionar sugestão para buscar similares
      if (data.category) {
        baseSuggestions.unshift(`Ver outros produtos de ${data.category}`);
      }
    }
    
    return baseSuggestions.slice(0, 4); // Limitar a 4 sugestões
  }
}

