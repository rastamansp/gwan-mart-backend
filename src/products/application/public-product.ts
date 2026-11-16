import { Product } from '../domain/entities/product.entity';

/**
 * Projeção pública do produto: o que um visitante anônimo pode ver.
 *
 * É uma lista de PERMISSÃO, não de bloqueio. Coluna nova na entidade não sai
 * numa rota pública até alguém decidir acrescentá-la aqui — com lista de
 * bloqueio, o próximo campo comercial vazaria em silêncio, que é como o
 * `costPrice` saía pela busca semântica.
 *
 * Fica de fora, de propósito:
 * - `costPrice` e `supplier`: dado comercial (margem e de quem se compra);
 * - `gtinEanPackage`: código da embalagem de compra, a vitrine não usa;
 * - `deletedAt`: estado interno do soft delete.
 *
 * `supplierProductDescription` fica DENTRO: apesar do nome, é a descrição do
 * produto (a vitrine e a prévia de link a mostram como texto principal), não
 * um dado sobre o fornecedor.
 *
 * Rotas de admin devolvem a entidade inteira e não passam por aqui.
 */
export const PUBLIC_PRODUCT_FIELDS = [
  'id',
  'code',
  'name',
  'description',
  'supplierProductDescription',
  'category',
  'subcategory',
  'ncm',
  'gtinEan',
  'stock',
  'originalPrice',
  'promotionalPrice',
  'discountPercentage',
  'averageRating',
  'totalReviews',
  'thumbnail',
  'realImage',
  'variations',
  'isActive',
  'isFeatured',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof Product)[];

/** Campos que nunca podem aparecer numa resposta pública (usado nos testes). */
export const INTERNAL_PRODUCT_FIELDS = [
  'costPrice',
  'supplier',
  'gtinEanPackage',
  'deletedAt',
] as const satisfies readonly (keyof Product)[];

export interface PublicProductImage {
  id: number;
  url: string;
  alt: string | null;
  order: number;
  isActive: boolean;
}

export type PublicProduct = Pick<
  Product,
  (typeof PUBLIC_PRODUCT_FIELDS)[number]
> & { images: PublicProductImage[] };

export function toPublicProduct(product: Product): PublicProduct {
  const projected = {} as Record<string, unknown>;
  for (const field of PUBLIC_PRODUCT_FIELDS) {
    projected[field] = product[field];
  }

  // Imagem desativada no admin não é da vitrine; e a relação carrega o
  // `product` de volta quando vem de um join, o que não deve sair junto.
  projected.images = (product.images ?? [])
    .filter((image) => image && image.isActive !== false)
    .map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt ?? null,
      order: image.order,
      isActive: image.isActive,
    }));

  return projected as PublicProduct;
}

export function toPublicProducts(products: Product[]): PublicProduct[] {
  return products.map(toPublicProduct);
}

/**
 * Campos de `metadata` de um resultado de busca. Vale para os DOIS modos — o
 * textual, que lê a entidade, e o semântico, que lê o `metadata` gravado no
 * chunk (onde estão `costPrice` e `supplier`, porque o chunk serve também à
 * indexação interna).
 */
export const PUBLIC_SEARCH_METADATA_FIELDS = [
  'category',
  'subcategory',
  'originalPrice',
  'promotionalPrice',
  'discountPercentage',
  'stock',
  'averageRating',
  'totalReviews',
  'isActive',
  'isFeatured',
] as const;

export type PublicSearchMetadata = Partial<
  Record<(typeof PUBLIC_SEARCH_METADATA_FIELDS)[number], unknown>
>;

export function toPublicSearchMetadata(
  source: Record<string, unknown> | Product | null | undefined,
): PublicSearchMetadata {
  const metadata: PublicSearchMetadata = {};
  if (!source) return metadata;

  const record = source as Record<string, unknown>;
  for (const field of PUBLIC_SEARCH_METADATA_FIELDS) {
    if (record[field] !== undefined) metadata[field] = record[field];
  }
  return metadata;
}
