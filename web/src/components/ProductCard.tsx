import { Link } from 'react-router-dom';
import { effectivePrice, formatPrice, type Product } from '../lib/api';
import { Rating } from './Rating';

export function ProductCard({ product }: { product: Product }) {
  const { price, original, discount } = effectivePrice(product);
  const outOfStock = product.stock <= 0;

  return (
    <Link
      to={`/product/${encodeURIComponent(product.code)}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-brand-500 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        <img
          src={product.thumbnail || product.realImage}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-1 text-xs font-semibold text-white">
            -{Math.round(discount)}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute right-2 top-2 rounded-full bg-zinc-900/80 px-2 py-1 text-xs font-medium text-white">
            Sem estoque
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {product.category}
        </p>
        <h3 className="line-clamp-2 font-medium text-zinc-900">{product.name}</h3>

        <Rating value={product.averageRating} total={product.totalReviews} />

        <div className="mt-auto pt-3">
          {original !== null && (
            <p className="text-xs text-zinc-400 line-through">
              {formatPrice(original)}
            </p>
          )}
          <p className="text-lg font-semibold text-brand-700">
            {formatPrice(price)}
          </p>
        </div>
      </div>
    </Link>
  );
}
