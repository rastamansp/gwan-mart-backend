import { buildProductUrl } from '../chat/services/formatters/product-url';

/**
 * Geração do HTML/XML de SEO da loja (mart.gwan.cloud).
 *
 * Funções puras: recebem o produto e o endereço da loja e devolvem texto. O
 * controller só busca o produto e entrega o resultado — ver
 * openspec/changes/add-storefront-seo/design.md.
 *
 * O trecho de <head> é injetado CRU no index.html pelo SSI do nginx, então
 * tudo que vem do catálogo (nome e descrição são dados de fornecedor) passa por
 * escapeHtml antes de entrar.
 */

export const SITE_NAME = 'Gwan Mart';

/** Tamanho máximo da descrição na prévia — o WhatsApp corta por volta disso. */
const DESCRIPTION_MAX = 200;

export interface SeoSite {
  /** Origem pública da loja, ex.: https://mart.gwan.cloud */
  baseUrl: string;
  /** Rota de produto da loja, ex.: product (a mesma do bot). */
  productPath: string;
}

/** Campos do produto que a prévia usa — subconjunto da entidade Product. */
export interface SeoProduct {
  code: string;
  name: string;
  description?: string | null;
  supplierProductDescription?: string | null;
  originalPrice: number | string | null;
  promotionalPrice?: number | string | null;
  realImage?: string | null;
  thumbnail?: string | null;
  images?: { url: string; order?: number; isActive?: boolean }[] | null;
  isActive?: boolean;
  updatedAt?: Date | string | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** XML usa as mesmas cinco entidades. */
export const escapeXml = escapeHtml;

export function siteRoot(site: SeoSite): string {
  return site.baseUrl.replace(/\/+$/, '');
}

export function defaultImageUrl(site: SeoSite): string {
  return `${siteRoot(site)}/og-default.png`;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Mesma regra da loja: promocional só vale se existir e for menor. */
export function effectivePrice(product: SeoProduct): {
  price: number;
  original: number | null;
} {
  const original = toNumber(product.originalPrice);
  const promotional = toNumber(product.promotionalPrice);
  const hasPromotion = promotional > 0 && promotional < original;
  return {
    price: hasPromotion ? promotional : original,
    original: hasPromotion ? original : null,
  };
}

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** "R$ 799,00 (de R$ 999,00) — descrição", cortada no tamanho da prévia. */
export function productDescription(product: SeoProduct): string {
  const { price, original } = effectivePrice(product);
  const priceText =
    price > 0
      ? original
        ? `${formatBrl(price)} (de ${formatBrl(original)})`
        : formatBrl(price)
      : '';
  const text =
    collapse(product.description) ||
    collapse(product.supplierProductDescription);
  const joined = [priceText, text].filter(Boolean).join(' — ');
  return truncate(joined || `${product.name} na ${SITE_NAME}.`, DESCRIPTION_MAX);
}

function isAbsoluteHttpUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim());
}

/**
 * Imagem da prévia: a primeira URL absoluta entre realImage, thumbnail e as
 * imagens ativas por ordem. Caminho relativo não serve — o WhatsApp busca a
 * imagem de fora, sem saber de qual host ela é.
 */
export function productImageUrl(product: SeoProduct): string | null {
  const gallery = (product.images ?? [])
    .filter((image) => image && image.isActive !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((image) => image.url);

  const found = [product.realImage, product.thumbnail, ...gallery].find(
    isAbsoluteHttpUrl,
  );
  return found ? found.trim() : null;
}

export function productPageUrl(site: SeoSite, code: string): string {
  return buildProductUrl(site.baseUrl, site.productPath, code);
}

/**
 * Trecho de <head> da página de um produto: título, descrição, canonical,
 * Open Graph e Twitter. Substitui o bloco padrão do index.html (via SSI).
 */
export function buildProductHead(product: SeoProduct, site: SeoSite): string {
  const name = collapse(product.name) || product.code;
  const title = `${name} | ${SITE_NAME}`;
  const description = productDescription(product);
  const url = productPageUrl(site, product.code);
  const image = productImageUrl(product);
  const { price } = effectivePrice(product);

  const tags: string[] = [
    `<title>${escapeHtml(title)}</title>`,
    meta('name', 'description', description),
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    meta('property', 'og:type', 'product'),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:locale', 'pt_BR'),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
  ];

  if (image) {
    tags.push(meta('property', 'og:image', image));
  } else {
    // Imagem padrão da loja: dimensões conhecidas, então vão junto.
    tags.push(
      meta('property', 'og:image', defaultImageUrl(site)),
      meta('property', 'og:image:width', '1200'),
      meta('property', 'og:image:height', '630'),
    );
  }
  tags.push(meta('property', 'og:image:alt', name));

  if (price > 0) {
    tags.push(
      meta('property', 'product:price:amount', price.toFixed(2)),
      meta('property', 'product:price:currency', 'BRL'),
    );
  }

  tags.push(
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', image ?? defaultImageUrl(site)),
  );

  return `${tags.join('\n    ')}\n`;
}

function meta(attr: 'name' | 'property', key: string, content: string): string {
  return `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
}

function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * sitemap.xml: home, catálogo e todo produto ATIVO, com o mesmo endereço que o
 * bot manda nos links (buildProductUrl).
 */
export function buildSitemap(products: SeoProduct[], site: SeoSite): string {
  const root = siteRoot(site);
  const entries: { loc: string; lastmod?: string | null }[] = [
    { loc: `${root}/` },
    { loc: `${root}/catalog` },
  ];

  const seen = new Set<string>();
  for (const product of products) {
    if (!product || product.isActive === false || !product.code) continue;
    if (seen.has(product.code)) continue;
    seen.add(product.code);
    entries.push({
      loc: productPageUrl(site, product.code),
      lastmod: isoDate(product.updatedAt),
    });
  }

  const body = entries
    .map(({ loc, lastmod }) =>
      lastmod
        ? `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`
        : `  <url><loc>${escapeXml(loc)}</loc></url>`,
    )
    .join('\n');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n` +
    '</urlset>\n'
  );
}
