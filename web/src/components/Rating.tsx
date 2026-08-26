import { toNumber } from '../lib/api';

/**
 * Avaliação em estrelas.
 *
 * Produto sem avaliação não renderiza nada: mostrar cinco estrelas vazias com
 * "0.0" sugere produto mal avaliado, quando o caso é não ter avaliação nenhuma.
 */
export function Rating({
  value,
  total,
  size = 'sm',
}: {
  value: string | number | null | undefined;
  total?: number;
  size?: 'sm' | 'md';
}) {
  const rating = toNumber(value);
  if (rating <= 0) return null;

  const dimension = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex"
        role="img"
        aria-label={`Nota ${rating.toFixed(1)} de 5`}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={dimension}
            filled={index < Math.round(rating)}
          />
        ))}
      </div>
      <span className="text-sm text-zinc-600">{rating.toFixed(1)}</span>
      {typeof total === 'number' && total > 0 && (
        <span className="text-sm text-zinc-400">({total})</span>
      )}
    </div>
  );
}

function Star({ className, filled }: { className: string; filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`${className} ${filled ? 'text-brand-500' : 'text-zinc-300'}`}
      fill="currentColor"
    >
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.74.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  );
}
