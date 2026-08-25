/**
 * Estados compartilhados das telas que dependem da API.
 *
 * Carregando, vazio e erro precisam ser visualmente distintos: com a API fora,
 * uma tela em branco é indistinguível de "catálogo sem produtos".
 */

export function LoadingGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-xl border border-zinc-200 bg-white"
        >
          <div className="aspect-square bg-zinc-200" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 rounded bg-zinc-200" />
            <div className="h-4 w-full rounded bg-zinc-200" />
            <div className="h-5 w-1/2 rounded bg-zinc-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <p className="font-medium text-red-800">{message}</p>
      <p className="mt-1 text-sm text-red-700">
        A loja depende da API do Mart. Se o problema persistir, verifique se ela está no ar.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <p className="font-medium text-zinc-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-zinc-500">{hint}</p>}
    </div>
  );
}
