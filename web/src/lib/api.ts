/**
 * Cliente da API do Gwan Mart.
 *
 * A API responde sempre no envelope `{ status: 'success', data: ... }`, e o
 * formato de `data` muda por rota: lista pagina em `{ products, total,
 * totalPages }`, destaques vêm como array puro, detalhe vem como objeto. O
 * desembrulho fica todo aqui — nenhuma tela deve conhecer o envelope.
 */

const BASE_URL: string =
  import.meta.env.VITE_MART_API_URL ?? 'http://localhost:3011/api';

export interface ProductImage {
  id: number;
  url: string;
  alt?: string | null;
  order: number;
  isActive: boolean;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  stock: number;
  supplier: string;
  ncm: string;
  /** A API devolve decimais como string (numeric do PostgreSQL). */
  originalPrice: string | number;
  promotionalPrice: string | number | null;
  discountPercentage: string | number;
  averageRating: string | number;
  totalReviews: number;
  thumbnail: string;
  realImage: string;
  images?: ProductImage[];
  isActive: boolean;
  isFeatured: boolean;
}

export interface ProductPage {
  products: Product[];
  total: number;
  totalPages: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // Rede fora, CORS barrado, API no chão: a tela precisa saber a diferença
    // entre "não veio nada" e "veio vazio".
    throw new ApiError('Não foi possível falar com a API do Mart.');
  }

  if (!response.ok) {
    throw new ApiError(
      response.status === 404
        ? 'Não encontrado.'
        : `A API respondeu ${response.status}.`,
      response.status,
    );
  }

  const body = (await response.json()) as { status?: string; data?: T };
  if (body?.data === undefined) {
    throw new ApiError('Resposta da API em formato inesperado.');
  }

  return body.data;
}

export interface CatalogQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export function fetchProducts(query: CatalogQuery = {}): Promise<ProductPage> {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 12));
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);

  return request<ProductPage>(`/products?${params.toString()}`);
}

export function fetchFeaturedProducts(): Promise<Product[]> {
  return request<Product[]>('/products/featured');
}

export function fetchProductByCode(code: string): Promise<Product> {
  return request<Product>(`/products/${encodeURIComponent(code)}`);
}

export interface ChatReply {
  answer: string;
  sessionId?: string;
}

/**
 * Envia mensagem ao assistente do Mart.
 *
 * Diferente das rotas de catálogo, `/chat` NÃO usa o envelope
 * `{ status, data }`: devolve `{ answer, sessionId }` na raiz. Por isso não
 * passa por request().
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
): Promise<ChatReply> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionId ? { message, sessionId } : { message }),
    });
  } catch {
    throw new ApiError('Não foi possível falar com o assistente.');
  }

  if (!response.ok) {
    throw new ApiError(
      `O assistente respondeu ${response.status}.`,
      response.status,
    );
  }

  return (await response.json()) as ChatReply;
}

/** Normaliza os decimais que a API entrega como string. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

export function formatPrice(value: string | number | null | undefined): string {
  return toNumber(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Preço efetivo: promocional quando existir e for menor que o original. */
export function effectivePrice(product: Product): {
  price: number;
  original: number | null;
  discount: number;
} {
  const original = toNumber(product.originalPrice);
  const promotional = toNumber(product.promotionalPrice);
  const hasPromotion = promotional > 0 && promotional < original;

  return {
    price: hasPromotion ? promotional : original,
    original: hasPromotion ? original : null,
    discount: hasPromotion ? toNumber(product.discountPercentage) : 0,
  };
}

export function productImages(product: Product): string[] {
  const gallery = (product.images ?? [])
    .filter((image) => image.isActive)
    .sort((a, b) => a.order - b.order)
    .map((image) => image.url);

  const all = [product.realImage, product.thumbnail, ...gallery].filter(
    (url): url is string => Boolean(url),
  );

  return Array.from(new Set(all));
}
