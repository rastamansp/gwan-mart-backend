import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, fetchProducts, type ProductPage } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingGrid } from '../components/States';

const PAGE_SIZE = 12;

export function CatalogPage() {
  // A busca vive na URL: um catálogo filtrado precisa ser compartilhável, e
  // voltar do produto tem que devolver o visitante ao mesmo lugar.
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const [term, setTerm] = useState(search);
  const [result, setResult] = useState<ProductPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setTerm(search), [search]);

  useEffect(() => {
    let active = true;
    setResult(null);
    setError(null);

    fetchProducts({ page, limit: PAGE_SIZE, search, category })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Falha ao carregar o catálogo.',
        );
      });

    return () => {
      active = false;
    };
  }, [page, search, category, attempt]);

  function updateParams(next: Record<string, string | undefined>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    setParams(merged);
  }

  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Catálogo</h1>
        {result && (
          <p className="text-sm text-zinc-500">
            {result.total} produto{result.total === 1 ? '' : 's'}
            {category && ` em ${category}`}
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ search: term.trim() || undefined, page: undefined });
        }}
        className="flex gap-2"
      >
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar por nome ou descrição"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white transition hover:bg-zinc-700"
        >
          Buscar
        </button>
      </form>

      {(search || category) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {search && (
            <button
              type="button"
              onClick={() => updateParams({ search: undefined, page: undefined })}
              className="rounded-full bg-zinc-200 px-3 py-1 text-zinc-700 transition hover:bg-zinc-300"
            >
              busca: {search} ✕
            </button>
          )}
          {category && (
            <button
              type="button"
              onClick={() =>
                updateParams({ category: undefined, page: undefined })
              }
              className="rounded-full bg-zinc-200 px-3 py-1 text-zinc-700 transition hover:bg-zinc-300"
            >
              categoria: {category} ✕
            </button>
          )}
        </div>
      )}

      {error && (
        <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
      )}

      {!error && result === null && <LoadingGrid />}

      {!error && result !== null && result.products.length === 0 && (
        <EmptyState
          title="Nenhum produto encontrado"
          hint={
            search || category
              ? 'Tente outra busca ou remova os filtros.'
              : 'O catálogo ainda não tem produtos cadastrados.'
          }
        />
      )}

      {!error && result !== null && result.products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {result.products.map((product) => (
              <ProductCard key={product.code} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-600">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
