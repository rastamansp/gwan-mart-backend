import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ApiError,
  fetchAllProducts,
  fetchProducts,
  searchSimilarProducts,
  type Product,
  type ProductPage,
  type SimilarProduct,
} from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingGrid } from '../components/States';

const PAGE_SIZES = [12, 24, 48];

export function CatalogPage() {
  // A busca vive na URL: um catálogo filtrado precisa ser compartilhável, e
  // voltar do produto tem que devolver o visitante ao mesmo lugar.
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const category = params.get('category') ?? '';
  const subcategory = params.get('subcategory') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const limit = PAGE_SIZES.includes(Number(params.get('limit')))
    ? Number(params.get('limit'))
    : PAGE_SIZES[0];

  const [term, setTerm] = useState(search);
  const [result, setResult] = useState<ProductPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Taxonomia para os filtros: a API não expõe endpoint de categorias, então ela
  // é derivada do catálogo inteiro (GET /products/all).
  const [taxonomy, setTaxonomy] = useState<Product[]>([]);

  // Busca por similaridade — modo alternativo, resultados de outro formato.
  const [aiMode, setAiMode] = useState(false);
  const [aiResults, setAiResults] = useState<SimilarProduct[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => setTerm(search), [search]);

  useEffect(() => {
    fetchAllProducts()
      .then(setTaxonomy)
      .catch(() => setTaxonomy([])); // filtro é conveniência: falhar aqui não quebra o catálogo
  }, []);

  useEffect(() => {
    if (aiMode) return;

    let active = true;
    setResult(null);
    setError(null);

    fetchProducts({ page, limit, search, category, subcategory })
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
  }, [page, limit, search, category, subcategory, attempt, aiMode]);

  const categories = useMemo(
    () =>
      Array.from(new Set(taxonomy.map((p) => p.category).filter(Boolean))).sort(),
    [taxonomy],
  );

  const subcategories = useMemo(
    () =>
      Array.from(
        new Set(
          taxonomy
            .filter((p) => !category || p.category === category)
            .map((p) => p.subcategory)
            .filter(Boolean),
        ),
      ).sort(),
    [taxonomy, category],
  );

  function updateParams(next: Record<string, string | undefined>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    setParams(merged);
  }

  async function runSimilaritySearch(query: string) {
    if (!query.trim()) return;

    setAiLoading(true);
    setAiError(null);
    setAiResults(null);

    try {
      const data = await searchSimilarProducts(query.trim());
      setAiResults(data.results ?? []);
    } catch (caught) {
      // Três causas distintas, três mensagens: o 500 aqui quase sempre é falta
      // de OPENAI_API_KEY no servidor, e dizer "nenhum resultado" mandaria o
      // visitante procurar defeito na própria busca.
      if (caught instanceof ApiError && caught.status === 429) {
        setAiError(
          'Muitas buscas seguidas. Aguarde um minuto antes de tentar de novo.',
        );
      } else if (caught instanceof ApiError && caught.status === 500) {
        setAiError(
          'A busca por similaridade está indisponível no servidor. Use a busca normal.',
        );
      } else {
        setAiError(
          caught instanceof ApiError
            ? caught.message
            : 'Falha na busca por similaridade.',
        );
      }
    } finally {
      setAiLoading(false);
    }
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (aiMode) {
      void runSimilaritySearch(term);
      return;
    }
    updateParams({ search: term.trim() || undefined, page: undefined });
  }

  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Catálogo</h1>
        {!aiMode && result && (
          <p className="text-sm text-zinc-500">
            {result.total} produto{result.total === 1 ? '' : 's'}
            {category && ` em ${category}`}
          </p>
        )}
        {aiMode && aiResults && (
          <p className="text-sm text-zinc-500">
            {aiResults.length} produto{aiResults.length === 1 ? '' : 's'} similar
            {aiResults.length === 1 ? '' : 'es'}
          </p>
        )}
      </div>

      <form onSubmit={submitSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={
              aiMode
                ? 'Descreva o que procura (busca por similaridade)'
                : 'Buscar por nome ou descrição'
            }
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white transition hover:bg-zinc-700"
          >
            Buscar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              setAiMode((on) => !on);
              setAiResults(null);
              setAiError(null);
            }}
            className={`rounded-full border px-3 py-1 transition ${
              aiMode
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-zinc-300 text-zinc-600 hover:border-brand-500'
            }`}
          >
            {aiMode ? '✦ Busca por similaridade ativa' : '✦ Buscar por similaridade'}
          </button>

          {!aiMode && (
            <>
              <select
                value={category}
                onChange={(event) =>
                  updateParams({
                    category: event.target.value || undefined,
                    subcategory: undefined,
                    page: undefined,
                  })
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1 outline-none focus:border-brand-500"
              >
                <option value="">Todas as categorias</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={subcategory}
                onChange={(event) =>
                  updateParams({
                    subcategory: event.target.value || undefined,
                    page: undefined,
                  })
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1 outline-none focus:border-brand-500"
              >
                <option value="">Todas as subcategorias</option>
                {subcategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-zinc-600">
                Por página
                <select
                  value={String(limit)}
                  onChange={(event) =>
                    updateParams({ limit: event.target.value, page: undefined })
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 outline-none focus:border-brand-500"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      </form>

      {!aiMode && (search || category || subcategory) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {search && (
            <Chip
              label={`busca: ${search}`}
              onClear={() => updateParams({ search: undefined, page: undefined })}
            />
          )}
          {category && (
            <Chip
              label={`categoria: ${category}`}
              onClear={() =>
                updateParams({
                  category: undefined,
                  subcategory: undefined,
                  page: undefined,
                })
              }
            />
          )}
          {subcategory && (
            <Chip
              label={`subcategoria: ${subcategory}`}
              onClear={() =>
                updateParams({ subcategory: undefined, page: undefined })
              }
            />
          )}
        </div>
      )}

      {aiMode ? (
        <SimilaritySection
          loading={aiLoading}
          error={aiError}
          results={aiResults}
        />
      ) : (
        <>
          {error && (
            <ErrorState
              message={error}
              onRetry={() => setAttempt((n) => n + 1)}
            />
          )}

          {!error && result === null && <LoadingGrid />}

          {!error && result !== null && result.products.length === 0 && (
            <EmptyState
              title="Nenhum produto encontrado"
              hint={
                search || category || subcategory
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
        </>
      )}
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="rounded-full bg-zinc-200 px-3 py-1 text-zinc-700 transition hover:bg-zinc-300"
    >
      {label} ✕
    </button>
  );
}

function SimilaritySection({
  loading,
  error,
  results,
}: {
  loading: boolean;
  error: string | null;
  results: SimilarProduct[] | null;
}) {
  if (loading) return <LoadingGrid count={4} />;

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-medium text-amber-900">{error}</p>
      </div>
    );
  }

  if (results === null) {
    return (
      <EmptyState
        title="Descreva o que você procura"
        hint="A busca por similaridade compara o sentido da frase com o catálogo, não só as palavras."
      />
    );
  }

  if (results.length === 0) {
    return <EmptyState title="Nenhum produto similar encontrado" />;
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {results.map((item) => (
        <li key={item.productCode}>
          <a
            href={`/product/${encodeURIComponent(item.productCode)}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-brand-500"
          >
            <span>
              <span className="block font-medium text-zinc-900">
                {item.productName}
              </span>
              <span className="block text-sm text-zinc-500">
                {item.productCode}
                {item.metadata?.category && ` · ${item.metadata.category}`}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
              {Math.round(item.similarity * 100)}%
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
