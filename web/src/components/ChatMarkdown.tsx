import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';

/**
 * Renderiza a resposta do assistente.
 *
 * O backend devolve Markdown (WebFormatterService monta títulos, preços com
 * `~~riscado~~`, imagem e link "Ver detalhes"). Exibir como texto puro mostrava
 * `##` e `**` na tela.
 *
 * Links de produto viram navegação interna: eles apontam para a própria loja
 * (FRONTEND_URL + FRONTEND_PRODUCT_PATH), então recarregar a página seria
 * desperdício — e perderia a conversa aberta.
 */
export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <p className="text-sm font-semibold text-zinc-900">{children}</p>
          ),
          h2: ({ children }) => (
            <p className="pt-1 text-sm font-semibold text-zinc-900">{children}</p>
          ),
          h3: ({ children }) => (
            <p className="pt-1 font-medium text-zinc-900">{children}</p>
          ),
          p: ({ children }) => <p className="text-zinc-700">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-0.5 pl-4 text-zinc-700">
              {children}
            </ul>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900">{children}</strong>
          ),
          del: ({ children }) => (
            <del className="text-zinc-400">{children}</del>
          ),
          hr: () => <hr className="my-2 border-zinc-200" />,
          img: ({ src, alt }) => (
            <img
              src={typeof src === 'string' ? src : undefined}
              alt={alt ?? ''}
              loading="lazy"
              className="my-1 h-28 w-28 rounded-lg border border-zinc-200 object-cover"
            />
          ),
          a: ({ href, children }) => {
            const internal = toInternalPath(href);
            if (internal) {
              return (
                <Link
                  to={internal}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-700 hover:underline"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

/** Devolve o caminho interno quando o link aponta para esta mesma loja. */
function toInternalPath(href?: string): string | null {
  if (!href) return null;

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
