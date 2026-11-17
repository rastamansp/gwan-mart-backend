import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, formatPrice } from '../../lib/api';
import {
  ACCEPTED_IMAGE_TYPES,
  createProduct,
  fetchAdminProducts,
  MAX_IMAGE_MB,
  updateProduct,
  uploadProductImage,
  type AdminProduct,
} from '../../lib/admin-api';
import {
  codeFromName,
  discountPercent,
  EMPTY_FORM,
  formFromProduct,
  parseMoney,
  payloadFromForm,
  validateForm,
  type FormErrors,
  type ProductFormState,
} from '../../lib/product-form';
import { ErrorState } from '../../components/States';
import { useAdminSession } from './AdminSession';

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? (
        <span data-field-error className="mt-1 block text-xs text-red-700">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
      )}
    </label>
  );
}

export function AdminProductFormPage() {
  const { id } = useParams();
  const editingId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { handleError } = useAdminSession();

  const [catalog, setCatalog] = useState<AdminProduct[] | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Enquanto o lojista não mexe no código, ele acompanha o nome.
  const codeTouched = useRef(Boolean(editingId));
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAdminProducts()
      .then((products) => {
        setCatalog(products);
        if (editingId) {
          const product = products.find((item) => item.id === editingId);
          if (!product) setLoadError('Produto não encontrado. Ele pode ter sido removido.');
          else setForm(formFromProduct(product));
        }
      })
      .catch((error) => setLoadError(handleError(error)));
  }, [editingId, handleError]);

  const categories = useMemo(
    () => Array.from(new Set((catalog ?? []).map((p) => p.category).filter(Boolean))).sort(),
    [catalog],
  );
  const subcategories = useMemo(
    () =>
      Array.from(
        new Set(
          (catalog ?? [])
            .filter((p) => !form.category || p.category === form.category)
            .map((p) => p.subcategory)
            .filter(Boolean),
        ),
      ).sort(),
    [catalog, form.category],
  );

  function set<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'name' && !codeTouched.current) next.code = codeFromName(String(value));
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    const list = Array.from(files);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const url = await uploadProductImage(file);
        setForm((current) => ({ ...current, images: [...current.images, url] }));
        setErrors((current) => ({ ...current, images: undefined }));
      } catch (error) {
        setUploadError(handleError(error));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  }

  function moveImage(index: number, delta: number) {
    setForm((current) => {
      const images = current.images.slice();
      const target = index + delta;
      if (target < 0 || target >= images.length) return current;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...current, images };
    });
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    const found = validateForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSubmitError('Confira os campos marcados.');
      // Espera o React pintar as mensagens e leva a pessoa até a primeira.
      requestAnimationFrame(() =>
        document
          .querySelector('[data-field-error]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }

    setSaving(true);
    try {
      const payload = payloadFromForm(form);
      if (editingId) await updateProduct(editingId, payload);
      else await createProduct(payload);
      navigate('/admin', { replace: true });
    } catch (error) {
      const message = handleError(error);
      if (error instanceof ApiError && error.status === 409) {
        setErrors((current) => ({ ...current, code: 'Este código já está em uso.' }));
      }
      setSubmitError(message);
      setSaving(false);
    }
  }

  if (loadError) return <ErrorState message={loadError} />;
  if (!catalog) return <p className="py-10 text-center text-sm text-zinc-500">Carregando…</p>;

  const price = parseMoney(form.price);
  const promo = form.promoPrice.trim() ? parseMoney(form.promoPrice) : null;
  const discount = discountPercent(price, promo);

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Produtos
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">
          {editingId ? `Editar: ${form.name || 'produto'}` : 'Novo produto'}
        </h1>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Fotos</h2>
        <p className="text-sm text-zinc-500">
          A primeira é a capa na loja. JPG, PNG ou WebP, até {MAX_IMAGE_MB} MB cada.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {form.images.map((url, index) => (
            <div key={url + index} className="group relative">
              <img
                src={url}
                alt={`Foto ${index + 1}`}
                className="aspect-square w-full rounded-lg border border-zinc-200 bg-zinc-100 object-cover"
              />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Capa
                </span>
              )}
              <div className="mt-1 flex justify-center gap-1">
                <button
                  type="button"
                  aria-label="Mover para a esquerda"
                  disabled={index === 0}
                  onClick={() => moveImage(index, -1)}
                  className="rounded border border-zinc-300 px-2 text-xs disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Mover para a direita"
                  disabled={index === form.images.length - 1}
                  onClick={() => moveImage(index, 1)}
                  className="rounded border border-zinc-300 px-2 text-xs disabled:opacity-30"
                >
                  →
                </button>
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() => removeImage(index)}
                  className="rounded border border-red-200 px-2 text-xs text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-500 transition hover:border-brand-500 hover:text-brand-700"
          >
            {uploading > 0 ? `Enviando ${uploading}…` : '+ Adicionar fotos'}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        {(uploadError || errors.images) && (
          <p data-field-error className="mt-2 text-sm text-red-700">{uploadError ?? errors.images}</p>
        )}
      </section>

      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2">
        <h2 className="font-semibold text-zinc-900 sm:col-span-2">Produto</h2>
        <div className="sm:col-span-2">
          <Field label="Nome" error={errors.name}>
            <input
              className="admin-input"
              value={form.name}
              maxLength={255}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Código"
          hint="Identifica o produto no link da loja. Não pode repetir."
          error={errors.code}
        >
          <input
            className="admin-input font-mono"
            value={form.code}
            maxLength={255}
            onChange={(e) => {
              codeTouched.current = true;
              set('code', e.target.value.toUpperCase());
            }}
          />
        </Field>
        <div className="flex items-end gap-6 pb-1">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            Ativo na loja
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => set('isFeatured', e.target.checked)}
            />
            Destaque na home
          </label>
        </div>
        <Field label="Categoria" error={errors.category}>
          <input
            className="admin-input"
            list="admin-categories"
            value={form.category}
            maxLength={255}
            onChange={(e) => set('category', e.target.value)}
          />
          <datalist id="admin-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Subcategoria" error={errors.subcategory}>
          <input
            className="admin-input"
            list="admin-subcategories"
            value={form.subcategory}
            maxLength={255}
            onChange={(e) => set('subcategory', e.target.value)}
          />
          <datalist id="admin-subcategories">
            {subcategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descrição" error={errors.description}>
            <textarea
              className="admin-input min-h-[120px]"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3">
        <h2 className="font-semibold text-zinc-900 sm:col-span-3">Preço e estoque</h2>
        <Field label="Preço (R$)" error={errors.price}>
          <input
            className="admin-input"
            inputMode="decimal"
            placeholder="0,00"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
        </Field>
        <Field
          label="Preço promocional (R$)"
          hint={
            discount > 0
              ? `Desconto de ${discount.toLocaleString('pt-BR')}% — sai por ${formatPrice(promo)}`
              : 'Opcional. Deixe vazio se não estiver em promoção.'
          }
          error={errors.promoPrice}
        >
          <input
            className="admin-input"
            inputMode="decimal"
            placeholder="0,00"
            value={form.promoPrice}
            onChange={(e) => set('promoPrice', e.target.value)}
          />
        </Field>
        <Field label="Estoque" error={errors.stock}>
          <input
            className="admin-input"
            type="number"
            min={0}
            step={1}
            value={form.stock}
            onChange={(e) => set('stock', e.target.value)}
          />
        </Field>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Variações</h2>
        <p className="text-sm text-zinc-500">
          Opcional: tamanhos, cores ou modelos. O cliente escolhe na página do produto.
        </p>
        <div className="mt-3 space-y-2">
          {form.variations.map((variation, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                className="admin-input max-w-xs"
                placeholder="Nome (ex.: Tamanho M, Azul)"
                value={variation.nome}
                onChange={(e) =>
                  set(
                    'variations',
                    form.variations.map((v, i) => (i === index ? { ...v, nome: e.target.value } : v)),
                  )
                }
              />
              {/* Texto, não seletor: a página do produto mostra a cor escrita. */}
              <input
                className="admin-input max-w-[10rem]"
                aria-label="Cor"
                placeholder="Cor (opcional)"
                maxLength={60}
                value={variation.cor ?? ''}
                onChange={(e) =>
                  set(
                    'variations',
                    form.variations.map((v, i) => (i === index ? { ...v, cor: e.target.value } : v)),
                  )
                }
              />
              <label className="flex items-center gap-1.5 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={variation.disponivel !== false}
                  onChange={(e) =>
                    set(
                      'variations',
                      form.variations.map((v, i) =>
                        i === index ? { ...v, disponivel: e.target.checked } : v,
                      ),
                    )
                  }
                />
                Disponível
              </label>
              <button
                type="button"
                onClick={() =>
                  set(
                    'variations',
                    form.variations.filter((_, i) => i !== index),
                  )
                }
                className="text-sm text-red-700 hover:underline"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => set('variations', [...form.variations, { nome: '', disponivel: true }])}
          className="mt-3 text-sm font-medium text-brand-700 hover:underline"
        >
          + Adicionar variação
        </button>
      </section>

      <details className="rounded-xl border border-zinc-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold text-zinc-900">
          Dados fiscais e de fornecedor{' '}
          <span className="text-sm font-normal text-zinc-500">(opcionais)</span>
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="NCM">
            <input className="admin-input" maxLength={20} value={form.ncm} onChange={(e) => set('ncm', e.target.value)} />
          </Field>
          <Field label="GTIN/EAN">
            <input className="admin-input" maxLength={20} value={form.gtinEan} onChange={(e) => set('gtinEan', e.target.value)} />
          </Field>
          <Field label="GTIN/EAN da embalagem">
            <input
              className="admin-input"
              maxLength={20}
              value={form.gtinEanPackage}
              onChange={(e) => set('gtinEanPackage', e.target.value)}
            />
          </Field>
          <Field label="Fornecedor">
            <input className="admin-input" maxLength={255} value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
          </Field>
          <Field label="Custo (R$)" hint="Não aparece na loja." error={errors.costPrice}>
            <input
              className="admin-input"
              inputMode="decimal"
              placeholder="0,00"
              value={form.costPrice}
              onChange={(e) => set('costPrice', e.target.value)}
            />
          </Field>
          <div className="sm:col-span-3">
            <Field
              label="Descrição do fornecedor"
              hint="Se preenchida, a página do produto mostra esta em vez da descrição curta."
            >
              <textarea
                className="admin-input min-h-[80px]"
                value={form.supplierProductDescription}
                onChange={(e) => set('supplierProductDescription', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </details>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50/95 py-4 backdrop-blur">
        {submitError && (
          <p role="alert" className="mr-auto text-sm text-red-700">
            {submitError}
          </p>
        )}
        <Link
          to="/admin"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={saving || uploading > 0}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Cadastrar produto'}
        </button>
      </div>
    </form>
  );
}
