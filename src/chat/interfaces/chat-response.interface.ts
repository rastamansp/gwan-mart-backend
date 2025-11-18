/**
 * Tipos de resposta estruturada para formatação por canal
 */
export type ResponseType = 
  | 'product_list'
  | 'product_detail'
  | 'generic';

export interface PaginationInfo {
  current: number;
  total: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FormattedResponse {
  answer: string; // Resposta textual formatada
  data?: {
    type: ResponseType;
    items?: any[];
    pagination?: PaginationInfo;
    suggestions?: string[];
          rawData?: any; // Dados brutos para formatação adicional
  };
  media?: {
    type: 'image' | 'video' | 'document';
    url: string;
    caption?: string;
  }[];
}

export interface SuggestionsResponse {
  suggestions: string[];
}

