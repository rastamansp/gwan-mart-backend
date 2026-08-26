import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ApiError,
  effectivePrice,
  fetchProductByCode,
  formatPrice,
  productImages,
  productVariations,
  type Product,
  type ProductVariation,
} from '../lib/api';
import {
  buildOrderUrl,
  formatZipCode,
  SHIPPING_ORIGINS,
  whatsappNumber,
} from '../lib/whatsapp';
import { ErrorState } from '../components/States';
import { Rating } from '../components/Rating';
import { Notice, useNotice } from '../components/Notice';

export function ProductPage() {
  // A rota é /product/:code — o mesmo código que o bot usa no link "Ver
  // detalhes" e que a API expõe em GET /api/products/:code.
  const { code = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // Dados do pedido
  const [quantity, setQuantity] = useState(1);
  const [origin, setOrigin] = useState<string>(SHIPPING_ORIGINS[0]);
  const [zipCode, setZipCode] = useState('');
  const [variationIndex, setVariationIndex] = useState<number | null>(null);

  const { notice, notify } = useNotice();

  useEffect(() => {
    let active = true;
    setProduct(null);
    setError(null);
    setNotFound(false);
    setSelected(0);
    setQuantity(1);
    setVariationIndex(null);

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

  const variations = useMemo(
    () => (product ? productVariations(product) : []),
    [product],
  );

  async function share() {
    const url = window.location.href;
    const data = {
      title: product?.name ?? 'Gwan Mart',
      text: product?.description,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      notify('success', 'Link copiado.');
    } catch (caught) {
      // Cancelar o compartilhamento nativo não é falha.
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      notify('error', 'Não foi possível compartilhar.');
    }
  }

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
  const outOfStock = product.stock <= 0;

  const chosenVariation: ProductVariation | null =
    variationIndex !== null ? (variations[variationIndex] ?? null) : null;
  const needsVariation = variations.length > 0 && chosenVariation === null;

  const orderUrl = buildOrderUrl({
    productName: product.name,
    productCode: product.code,
    quantity,
    origin,
    price,
    variation: chosenVariation?.nome,
    zipCode: zipCode.trim() || undefined,
    productUrl: window.location.href,
  });
  const contactConfigured = whatsappNumber() !== null;

  return (
    <article className="space-y-8">
      <Notice notice={notice} />

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

          <Rating
            value={product.averageRating}
            total={product.totalReviews}
            size="md"
          />

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
              {outOfStock
                ? 'Sem estoque no momento'
                : `${product.stock} em estoque`}
            </p>
          </div>

          {variations.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="font-medium text-zinc-900">
                Escolha uma opção
              </legend>
              {variations.map((variation, index) => {
                const available = variation.disponivel !== false;
                const isSelected = variationIndex === index;

                return (
                  <button
                    key={`${variation.nome}-${index}`}
                    type="button"
                    disabled={!available}
                    onClick={() => setVariationIndex(index)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-zinc-200 hover:border-brand-500'
                    } ${available ? '' : 'cursor-not-allowed opacity-50'}`}
                  >
                    <span>
                      <span className="font-medium text-zinc-900">
                        {variation.nome}
                      </span>
                      {variation.cor && (
                        <span className="block text-sm text-zinc-500">
                          {variation.cor}
                        </span>
                      )}
                    </span>
                    {!available && (
                      <span className="text-xs font-medium text-zinc-500">
                        Indisponível
                      </span>
                    )}
                  </button>
                );
              })}
            </fieldset>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="quantity"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Quantidade
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-9 w-9 rounded-lg border border-zinc-300 text-lg leading-none text-zinc-700 transition hover:border-zinc-400"
                >
                  −
                </button>
                <span id="quantity" className="w-10 text-center font-medium">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  // Não deixa pedir mais do que existe: o atendente teria que
                  // voltar atrás na conversa.
                  disabled={quantity >= Math.max(1, product.stock)}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-9 w-9 rounded-lg border border-zinc-300 text-lg leading-none text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="origin"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Origem do frete
              </label>
              <select
                id="origin"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {SHIPPING_ORIGINS.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="zip"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                CEP de entrega <span className="text-zinc-400">(opcional)</span>
              </label>
              <input
                id="zip"
                inputMode="numeric"
                value={zipCode}
                onChange={(event) =>
                  setZipCode(formatZipCode(event.target.value))
                }
                placeholder="00000-000"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Vai junto no pedido para o atendente calcular o frete.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {contactConfigured && orderUrl ? (
              <a
                href={needsVariation ? undefined : orderUrl}
                target="_blank"
                rel="noreferrer"
                aria-disabled={needsVariation}
                onClick={(event) => {
                  if (needsVariation) {
                    event.preventDefault();
                    notify('error', 'Escolha uma opção antes de pedir.');
                  }
                }}
                className={`block w-full rounded-lg px-5 py-3 text-center font-medium text-white transition ${
                  needsVariation
                    ? 'cursor-not-allowed bg-zinc-300'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {needsVariation
                  ? 'Escolha uma opção para pedir'
                  : 'Pedir pelo WhatsApp'}
              </a>
            ) : (
              // Sem número configurado, oferecer o botão abriria uma conversa
              // para um destino inválido.
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                Pedido por WhatsApp indisponível: contato não configurado nesta
                loja.
              </p>
            )}

            <button
              type="button"
              onClick={() => void share()}
              className="w-full rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
            >
              Compartilhar
            </button>
          </div>

          <ul className="grid grid-cols-3 gap-3 border-t border-zinc-200 pt-4 text-center text-xs text-zinc-600">
            <li>
              <span className="block font-medium text-zinc-900">Garantia</span>
              12 meses
            </li>
            <li>
              <span className="block font-medium text-zinc-900">Frete</span>
              Grátis acima de R$ 199
            </li>
            <li>
              <span className="block font-medium text-zinc-900">Suporte</span>
              Via WhatsApp
            </li>
          </ul>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-2 font-medium text-zinc-900">Sobre o produto</h2>
          <p className="whitespace-pre-line text-zinc-700">
            {product.supplierProductDescription || product.description}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-zinc-900">
            Informações do produto
          </h2>
          <dl className="divide-y divide-zinc-100 text-sm">
            <Spec label="Código" value={product.code} />
            <Spec label="NCM" value={product.ncm} />
            <Spec label="GTIN/EAN" value={product.gtinEan} />
            <Spec label="Estoque" value={`${product.stock} unidades`} />
            <Spec label="Fornecedor" value={product.supplier} />
            <Spec
              label="Disponível"
              value={product.isActive && !outOfStock ? 'Sim' : 'Não'}
            />
          </dl>
        </div>
      </section>
    </article>
  );
}

function Spec({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
