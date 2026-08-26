import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, fetchFeaturedProducts, type Product } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingGrid } from '../components/States';
import { buildOrderUrl } from '../lib/whatsapp';

export function HomePage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setProducts(null);
    setError(null);

    fetchFeaturedProducts()
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Falha ao carregar os destaques.',
        );
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  // Contato geral: sem produto, só abre a conversa. Some quando o número não
  // está configurado.
  const contactUrl = buildOrderUrl({
    productName: 'Contato — Gwan Mart',
    productCode: 'CONTATO',
    quantity: 1,
    origin: 'São Paulo - SP',
  });

  const categories = Array.from(
    new Set((products ?? []).map((product) => product.category)),
  ).filter(Boolean);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 px-6 py-12 text-white md:px-12 md:py-16">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
          Tecnologia escolhida com ajuda de quem entende do catálogo
        </h1>
        <p className="mt-3 max-w-xl text-zinc-300">
          Navegue pelos produtos ou pergunte ao assistente — ele consulta o
          estoque real e responde com o que está disponível agora.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/catalog"
            className="rounded-lg bg-brand-500 px-5 py-3 font-medium text-zinc-900 transition hover:bg-brand-600 hover:text-white"
          >
            Ver o catálogo
          </Link>
          {contactUrl && (
            <a
              href={contactUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/40 px-5 py-3 font-medium text-white transition hover:bg-white/10"
            >
              Falar no WhatsApp
            </a>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">Destaques</h2>
          <Link
            to="/catalog"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {error && (
          <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
        )}

        {!error && products === null && <LoadingGrid count={4} />}

        {!error && products !== null && products.length === 0 && (
          <EmptyState
            title="Nenhum produto em destaque"
            hint="Marque produtos como destaque para eles aparecerem aqui."
          />
        )}

        {!error && products !== null && products.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.code} product={product} />
            ))}
          </div>
        )}
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-zinc-900">
            Categorias
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                to={`/catalog?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-brand-500 hover:text-brand-700"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
