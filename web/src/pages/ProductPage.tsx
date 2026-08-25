import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ApiError,
  effectivePrice,
  fetchProductByCode,
  formatPrice,
  productImages,
  toNumber,
  type Product,
} from '../lib/api';
import { ErrorState } from '../components/States';

export function ProductPage() {
  // A rota é /product/:code — o mesmo código que o bot usa no link "Ver
  // detalhes" e que a API expõe em GET /api/products/:code.
  const { code = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setProduct(null);
    setError(null);
    setNotFound(false);
    setSelected(0);

    fetchProductByCode(code)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof ApiError && caught.status === 404) {
          setNotFound(true);
          return;
        }
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Falha ao carregar o produto.',
        );
      });

    return () => {
      active = false;
    };
  }, [code, attempt]);

  if (notFound) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-lg font-medium text-zinc-800">
          Produto {code} não encontrado
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Ele pode ter saído do catálogo ou o link estar incorreto.
        </p>
        <Link
          to="/catalog"
          className="mt-5 inline-block rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white transition hover:bg-zinc-700"
        >
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />;
  }

  if (!product) {
    return (
      <div className="grid animate-pulse gap-8 md:grid-cols-2">
        <div className="aspect-square rounded-xl bg-zinc-200" />
        <div className="space-y-4 py-4">
          <div className="h-4 w-1/3 rounded bg-zinc-200" />
          <div className="h-8 w-3/4 rounded bg-zinc-200" />
          <div className="h-10 w-1/2 rounded bg-zinc-200" />
          <div className="h-24 w-full rounded bg-zinc-200" />
        </div>
      </div>
    );
  }

  const images = productImages(product);
  const { price, original, discount } = effectivePrice(product);
  const rating = toNumber(product.averageRating);

  return (
    <article className="space-y-8">
      <nav className="text-sm text-zinc-500">
        <Link to="/" className="hover:underline">
          Início
        </Link>
        <span className="px-2">/</span>
        <Link
          to={`/catalog?category=${encodeURIComponent(product.category)}`}
          className="hover:underline"
        >
          {product.category}
        </Link>
        <span className="px-2">/</span>
        <span className="text-zinc-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <img
              src={images[selected] ?? images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setSelected(index)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    index === selected ? 'border-brand-600' : 'border-zinc-200'
                  }`}
                >
                  <img
                    src={url}
                    alt={`${product.name} — imagem ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {product.category} · {product.subcategory}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Código {product.code}</p>
          </div>

          {rating > 0 && (
            <p className="text-sm text-zinc-600">
              ⭐ {rating.toFixed(1)}
              <span className="text-zinc-400">
                {' '}
                ({product.totalReviews} avaliações)
              </span>
            </p>
          )}

          <div>
            {original !== null && (
              <p className="text-sm text-zinc-400 line-through">
                {formatPrice(original)}
              </p>
            )}
            <p className="text-3xl font-bold text-brand-700">
              {formatPrice(price)}
              {discount > 0 && (
                <span className="ml-3 rounded-full bg-brand-100 px-3 py-1 align-middle text-sm font-semibold text-brand-700">
                  -{Math.round(discount)}%
                </span>
              )}
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              {product.stock > 0
                ? `${product.stock} em estoque`
                : 'Sem estoque no momento'}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-medium text-zinc-900">Descrição</h2>
            <p className="whitespace-pre-line text-zinc-700">
              {product.description}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 border-t border-zinc-200 pt-4 text-sm">
            <div>
              <dt className="text-zinc-500">Fornecedor</dt>
              <dd className="text-zinc-800">{product.supplier}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">NCM</dt>
              <dd className="text-zinc-800">{product.ncm}</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
