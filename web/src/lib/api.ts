/**
 * Cliente da API do Gwan Mart.
 *
 * A API responde sempre no envelope `{ status: 'success', data: ... }`, e o
 * formato de `data` muda por rota: lista pagina em `{ products, total,
 * totalPages }`, destaques vêm como array puro, detalhe vem como objeto. O
 * desembrulho fica todo aqui — nenhuma tela deve conhecer o envelope.
 */

/**
 * Em produção a URL vem da env (baked no build pelo compose).
 *
 * Sem env — o caso de dev —, derivamos do host pelo qual a loja está sendo
 * acessada: um celular que abre http://192.168.3.218:5184 precisa falar com
 * http://192.168.3.218:3011/api. Fixar "localhost" apontaria o aparelho para
 * ele mesmo, e a loja carregaria sem nenhum produto.
 */
function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_MART_API_URL;
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3011/api`;
  }

  return 'http://localhost:3011/api';
}

const BASE_URL: string = resolveBaseUrl();

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
  /** Descricao do fornecedor: mais completa que `description` quando existe. */
  supplierProductDescription?: string;
  /** A API devolve decimais como string (numeric do PostgreSQL). */
  originalPrice: string | number;
  promotionalPrice: string | number | null;
  discountPercentage: string | number;
  averageRating: string | number;
  totalReviews: number;
  thumbnail: string;
  realImage: string;
  images?: ProductImage[];
  /** `json` no banco: costuma vir `null`, e nem sempre é array. */
  variations?: ProductVariation[] | null;
  gtinEan?: string;
  isActive: boolean;
  isFeatured: boolean;
}

/** Variação de produto, como o catálogo do Mart a persiste. */
export interface ProductVariation {
  nome: string;
  cor?: string;
  disponivel?: boolean;
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
  subcategory?: string;
}

export function fetchProducts(query: CatalogQuery = {}): Promise<ProductPage> {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 12));
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);
  if (query.subcategory) params.set('subcategory', query.subcategory);

  return request<ProductPage>(`/products?${params.toString()}`);
}

/**
 * Catálogo inteiro, usado só para montar as listas de categoria e subcategoria
 * do filtro: a API não expõe endpoint de categorias.
 */
export function fetchAllProducts(): Promise<Product[]> {
  return request<Product[]>('/products/all');
}

export interface SimilarProduct {
  productId: number;
  productName: string;
  productCode: string;
  similarity: number;
  metadata?: {
    price?: string;
    stock?: number;
    category?: string;
    subcategory?: string;
    supplier?: string;
    isActive?: boolean;
    isFeatured?: boolean;
  };
}

/**
 * Busca por similaridade (embeddings).
 *
 * Depende de OPENAI_API_KEY no backend — mesmo com AI_PROVIDER=claude, porque o
 * chat é Claude mas o embedding é da OpenAI. Sem a chave a rota responde 500, e
 * a loja precisa dizer isso em vez de mostrar "nenhum resultado".
 *
 * Também tem teto de 10 chamadas/min por IP (429), por ser rota pública que gera
 * embedding pago.
 */
export function searchSimilarProducts(
  query: string,
): Promise<{ results: SimilarProduct[] }> {
  return request<{ results: SimilarProduct[] }>('/products/search/similar', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

/** Variações utilizáveis: tolera `null` e formatos inesperados do campo json. */
export function productVariations(product: Product): ProductVariation[] {
  if (!Array.isArray(product.variations)) return [];
  return product.variations.filter(
    (variation): variation is ProductVariation =>
      Boolean(variation) && typeof variation.nome === 'string',
  );
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
