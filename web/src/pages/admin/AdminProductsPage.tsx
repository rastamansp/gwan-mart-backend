import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { effectivePrice, formatPrice, type Product } from '../../lib/api';
import {
  deleteProduct,
  fetchAdminProducts,
  updateProduct,
  type AdminProduct,
} from '../../lib/admin-api';
import { EmptyState, ErrorState } from '../../components/States';
import { Notice, useNotice } from '../../components/Notice';
import { useAdminSession } from './AdminSession';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function AdminProductsPage() {
  const { handleError } = useAdminSession();
  const { notice, notify } = useNotice();

  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    fetchAdminProducts()
      .then(setProducts)
      .catch((error) => setLoadError(handleError(error)));
  }, [handleError]);

  useEffect(load, [load]);

  const visible = useMemo(() => {
    if (!products) return [];
    const term = normalize(query.trim());
    if (!term) return products;
    return products.filter(
      (product) =>
        normalize(product.name).includes(term) || normalize(product.code).includes(term),
    );
  }, [products, query]);

  async function toggle(product: Product, field: 'isActive' | 'isFeatured') {
    setBusyId(product.id);
    try {
      const updated = await updateProduct(product.id, { [field]: !product[field] });
      setProducts((list) => list?.map((item) => (item.id === product.id ? updated : item)) ?? null);
      notify(
        'success',
        field === 'isActive'
          ? updated.isActive
            ? 'Produto ativado: já aparece na loja.'
            : 'Produto desativado: saiu da loja.'
          : updated.isFeatured
            ? 'Produto em destaque na página inicial.'
            : 'Produto saiu dos destaques.',
      );
    } catch (error) {
      notify('error', handleError(error));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(product: Product) {
    const ok = window.confirm(
      `Remover "${product.name}"?\n\nEle some da loja e desta lista. O código ${product.code} não poderá ser usado de novo. Para só tirar da loja, use "Desativar".`,
    );
    if (!ok) return;
    setBusyId(product.id);
    try {
      await deleteProduct(product.id);
      setProducts((list) => list?.filter((item) => item.id !== product.id) ?? null);
      notify('success', 'Produto removido.');
    } catch (error) {
      notify('error', handleError(error));
    } finally {
      setBusyId(null);
    }
  }

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-lg font-semibold text-zinc-900">
          Produtos {products && <span className="text-zinc-400">({products.length})</span>}
        </h1>
        <input
          type="search"
          placeholder="Buscar por nome ou código"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="admin-input w-full sm:w-64"
        />
        <Link
          to="/admin/produtos/novo"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          + Novo produto
        </Link>
      </div>

      <div className="mt-5">
        {!products ? (
          <p className="py-10 text-center text-sm text-zinc-500">Carregando produtos…</p>
        ) : products.length === 0 ? (
          <EmptyState
            title="Nenhum produto cadastrado ainda"
            hint='Clique em "Novo produto" para cadastrar o primeiro.'
          />
        ) : visible.length === 0 ? (
          <EmptyState title="Nenhum produto encontrado" hint="Tente outro nome ou código." />
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {visible.map((product) => {
              const { price, original } = effectivePrice(product);
              const busy = busyId === product.id;
              return (
                <li
                  key={product.id}
                  className={`flex flex-wrap items-center gap-4 p-3 sm:flex-nowrap ${
                    product.isActive ? '' : 'bg-zinc-50'
                  }`}
                >
                  <img
                    src={product.thumbnail || product.realImage}
                    alt=""
                    className={`h-16 w-16 shrink-0 rounded-lg bg-zinc-100 object-cover ${
                      product.isActive ? '' : 'opacity-50'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/produtos/${product.id}`}
                      className="block truncate font-medium text-zinc-900 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {product.code} · {product.category}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      {!product.isActive && (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 font-medium text-zinc-700">
                          Inativo
                        </span>
                      )}
                      {product.isFeatured && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                          Destaque
                        </span>
                      )}
                      {product.stock <= 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                          Sem estoque
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-28 text-right text-sm">
                    {original !== null && (
                      <p className="text-xs text-zinc-400 line-through">{formatPrice(original)}</p>
                    )}
                    <p className="font-semibold text-zinc-900">{formatPrice(price)}</p>
                    <p className="text-xs text-zinc-500">{product.stock} em estoque</p>
                  </div>
                  <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                    <Link
                      to={`/admin/produtos/${product.id}`}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(product, 'isActive')}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      {product.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(product, 'isFeatured')}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      {product.isFeatured ? 'Tirar destaque' : 'Destacar'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(product)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Notice notice={notice} />
    </div>
  );
}
