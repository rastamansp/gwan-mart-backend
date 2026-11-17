/**
 * Regras do formulário de produto, fora do componente para ficarem legíveis.
 *
 * O formulário guarda tudo como texto (é o que o input devolve) e só converte
 * ao montar o payload. Preço aceita "19,90", "19.90" e "1.299,90".
 */
import { productVariations, toNumber, type ProductVariation } from './api';
import type { AdminProduct, ProductPayload } from './admin-api';

export interface ProductFormState {
  name: string;
  code: string;
  description: string;
  category: string;
  subcategory: string;
  price: string;
  promoPrice: string;
  stock: string;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  variations: ProductVariation[];
  ncm: string;
  gtinEan: string;
  gtinEanPackage: string;
  supplier: string;
  costPrice: string;
  supplierProductDescription: string;
}

export const EMPTY_FORM: ProductFormState = {
  name: '',
  code: '',
  description: '',
  category: '',
  subcategory: '',
  price: '',
  promoPrice: '',
  stock: '1',
  isActive: true,
  isFeatured: false,
  images: [],
  variations: [],
  ncm: '',
  gtinEan: '',
  gtinEanPackage: '',
  supplier: '',
  costPrice: '',
  supplierProductDescription: '',
};

/** "1.299,90" → 1299.9; vazio ou inválido → NaN. */
export function parseMoney(text: string): number {
  const clean = text.replace(/[^\d.,]/g, '');
  if (!clean) return NaN;
  const normalized = clean.includes(',')
    ? clean.replace(/\./g, '').replace(',', '.')
    : clean;
  return Number(normalized);
}

function moneyText(value: string | number | null | undefined): string {
  const number = toNumber(value);
  return number > 0 ? number.toFixed(2).replace('.', ',') : '';
}

/** Sugestão de código a partir do nome: "Fone Bluetooth X" → "FONE-BLUETOOTH-X". */
export function codeFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Desconto em %, com duas casas, a partir dos dois preços. */
export function discountPercent(price: number, promo: number | null): number {
  if (!promo || !(price > 0) || promo >= price) return 0;
  return Math.round((1 - promo / price) * 10000) / 100;
}

export function formFromProduct(product: AdminProduct): ProductFormState {
  const gallery = (product.images ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((image) => image.url);
  // Produtos antigos podem ter só thumbnail/realImage, sem galeria.
  const images = gallery.length
    ? gallery
    : [product.realImage, product.thumbnail].filter(
        (url, index, all): url is string => Boolean(url) && all.indexOf(url) === index,
      );

  return {
    name: product.name,
    code: product.code,
    description: product.description ?? '',
    category: product.category ?? '',
    subcategory: product.subcategory ?? '',
    price: moneyText(product.originalPrice),
    promoPrice: moneyText(product.promotionalPrice),
    stock: String(product.stock ?? 0),
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    images,
    variations: productVariations(product),
    ncm: product.ncm ?? '',
    gtinEan: product.gtinEan ?? '',
    gtinEanPackage: product.gtinEanPackage ?? '',
    supplier: product.supplier ?? '',
    costPrice: moneyText(product.costPrice),
    supplierProductDescription: product.supplierProductDescription ?? '',
  };
}

export type FormErrors = Partial<Record<keyof ProductFormState, string>>;

export function validateForm(form: ProductFormState): FormErrors {
  const errors: FormErrors = {};
  const price = parseMoney(form.price);
  const promo = form.promoPrice.trim() ? parseMoney(form.promoPrice) : null;
  const stock = Number(form.stock);

  if (!form.name.trim()) errors.name = 'Informe o nome.';
  if (!form.code.trim()) errors.code = 'Informe o código.';
  if (!form.description.trim()) errors.description = 'Escreva uma descrição.';
  if (!form.category.trim()) errors.category = 'Informe a categoria.';
  if (!form.subcategory.trim()) errors.subcategory = 'Informe a subcategoria.';
  if (!(price > 0)) errors.price = 'Informe um preço maior que zero.';
  if (promo !== null) {
    if (!(promo > 0)) errors.promoPrice = 'Preço promocional inválido.';
    else if (price > 0 && promo >= price)
      errors.promoPrice = 'O preço promocional precisa ser menor que o preço.';
  }
  if (!Number.isInteger(stock) || stock < 0) errors.stock = 'Estoque é um número inteiro, 0 ou mais.';
  if (form.images.length === 0) errors.images = 'Envie ao menos uma foto.';
  if (form.costPrice.trim() && !(parseMoney(form.costPrice) >= 0))
    errors.costPrice = 'Custo inválido.';

  return errors;
}

/** Assume um formulário já validado. A primeira foto é a capa. */
export function payloadFromForm(form: ProductFormState): ProductPayload {
  const price = parseMoney(form.price);
  const promo = form.promoPrice.trim() ? parseMoney(form.promoPrice) : null;
  const cost = form.costPrice.trim() ? parseMoney(form.costPrice) : 0;

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    subcategory: form.subcategory.trim(),
    originalPrice: price,
    promotionalPrice: promo,
    discountPercentage: discountPercent(price, promo),
    stock: Number(form.stock),
    isActive: form.isActive,
    isFeatured: form.isFeatured,
    thumbnail: form.images[0],
    realImage: form.images[0],
    images: form.images,
    variations: form.variations
      .map((variation) => ({
        nome: variation.nome.trim(),
        ...(variation.cor?.trim() ? { cor: variation.cor.trim() } : {}),
        disponivel: variation.disponivel !== false,
      }))
      .filter((variation) => variation.nome),
    // Dados fiscais: a API exige os campos, mas aceita vazio (design D6).
    ncm: form.ncm.trim(),
    gtinEan: form.gtinEan.trim(),
    gtinEanPackage: form.gtinEanPackage.trim(),
    supplier: form.supplier.trim(),
    costPrice: Number.isFinite(cost) ? cost : 0,
    supplierProductDescription: form.supplierProductDescription.trim(),
  };
}
