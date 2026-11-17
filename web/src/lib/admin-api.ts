/**
 * Cliente da área do lojista.
 *
 * Separado de `api.ts` porque aqui tudo leva token, e porque `/auth/*` responde
 * SEM o envelope `{ status, data }` que as rotas de produto usam. Qualquer 401
 * encerra a sessão: a API é quem decide o papel, a tela só reflete.
 */
import { ApiError, BASE_URL, type Product, type ProductVariation } from './api';

const TOKEN_KEY = 'gwan-mart-admin-token';

/** Papéis que a API deixa escrever no catálogo (`@Roles(ADMIN)`; o CORRETOR foi aposentado). */
export const CATALOG_ROLES = ['ADMIN'] as const;

/** Produto como `/products/admin/all` devolve: o público mais os campos internos. */
export type AdminProduct = Product & {
  supplier?: string;
  costPrice?: string | number;
  gtinEanPackage?: string;
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export class SessionExpiredError extends ApiError {
  constructor() {
    super('Sua sessão terminou. Entre de novo.', 401);
    this.name = 'SessionExpiredError';
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Armazenamento bloqueado: a sessão vale só até recarregar a página.
  }
}

export function logout(): void {
  setToken(null);
}

/** Mensagem da API: Nest devolve `message` como texto ou lista (validação). */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: { message?: string };
    };
    const message = body.message ?? body.error?.message;
    if (Array.isArray(message)) return message.join('; ');
    if (message) return message;
  } catch {
    // corpo não é JSON
  }
  return `A API respondeu ${response.status}.`;
}

async function call<T>(
  path: string,
  init: RequestInit = {},
  { envelope = true, auth = true } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (auth && token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Não foi possível falar com a API do Mart.');
  }

  if (response.status === 401 && auth) {
    setToken(null);
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }

  const body = await response.json();
  return (envelope ? body.data : body) as T;
}

export async function login(email: string, password: string): Promise<AdminUser> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError('Não foi possível falar com a API do Mart.');
  }
  if (response.status === 401) {
    throw new ApiError('E-mail ou senha incorretos.', 401);
  }
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  const body = (await response.json()) as { access_token: string; user: AdminUser };
  setToken(body.access_token);
  return body.user;
}

/** Papel atual, relido do banco pela API — não o que estava no token. */
export function fetchProfile(): Promise<AdminUser> {
  return call<AdminUser>('/auth/profile', {}, { envelope: false });
}

export function canEditCatalog(user: AdminUser | null): boolean {
  return Boolean(user && (CATALOG_ROLES as readonly string[]).includes(user.role));
}

/**
 * Todos os produtos não removidos, inclusive inativos, com os campos internos
 * (custo, fornecedor) que a projeção pública de `/products/all` omite — sem eles
 * o formulário de edição apagaria esses valores ao salvar.
 */
export function fetchAdminProducts(): Promise<AdminProduct[]> {
  return call<AdminProduct[]>('/products/admin/all');
}

export interface ProductPayload {
  code: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  originalPrice: number;
  promotionalPrice: number | null;
  discountPercentage: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  thumbnail: string;
  realImage: string;
  images: string[];
  variations: ProductVariation[];
  ncm: string;
  gtinEan: string;
  gtinEanPackage: string;
  supplier: string;
  costPrice: number;
  supplierProductDescription: string;
}

export function createProduct(payload: ProductPayload): Promise<Product> {
  return call<Product>('/products', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateProduct(
  id: number,
  payload: Partial<ProductPayload>,
): Promise<Product> {
  return call<Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: number): Promise<unknown> {
  return call<unknown>(`/products/${id}`, { method: 'DELETE' });
}

export const MAX_IMAGE_MB = 5;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadProductImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new ApiError(`"${file.name}" não é JPG, PNG ou WebP.`, 400);
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    throw new ApiError(`"${file.name}" passa de ${MAX_IMAGE_MB} MB.`, 413);
  }
  const form = new FormData();
  form.append('file', file);
  const { url } = await call<{ url: string }>('/products/images', {
    method: 'POST',
    body: form,
  });
  return url;
}
