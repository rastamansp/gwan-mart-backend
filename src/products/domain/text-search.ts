/**
 * Normalização da busca textual do catálogo.
 *
 * O PostgreSQL faria isso com `unaccent`, mas é extensão — exigiria migration
 * no banco compartilhado. `translate()` é nativo e, com a mesma tabela aplicada
 * aqui ao termo, dá o mesmo resultado para o português sem dependência nova.
 * Os dois lados precisam usar exatamente estas duas strings.
 */
export const ACCENTED_CHARS = 'áàâãäåéèêëíìîïóòôõöúùûüçñý';
export const PLAIN_CHARS = 'aaaaaaeeeeiiiiooooouuuucny';

const ACCENT_MAP = new Map(
  [...ACCENTED_CHARS].map((char, index) => [char, PLAIN_CHARS[index]]),
);

/** Minúsculas e sem acento, como o SQL de `searchByText` trata as colunas. */
export function normalizeSearchText(text: string): string {
  return [...text.trim().toLowerCase()]
    .map((char) => ACCENT_MAP.get(char) ?? char)
    .join('');
}

/** Teto de palavras consideradas: cada uma vira um LIKE por coluna. */
export const MAX_SEARCH_TOKENS = 8;

/**
 * Palavras da busca, normalizadas e sem repetição.
 *
 * A caixa da busca por similaridade pede uma descrição ("fone bluetooth sem
 * fio"), e na queda para textual a frase inteira como uma substring só não
 * casaria com nada. Cada palavra casa por si; palavras de menos de 3 letras
 * ("de", "um") são descartadas — salvo se forem tudo o que há ("tv").
 */
export function searchTokens(text: string): string[] {
  // Separa em pontuação também ("bluetooth," → "bluetooth"); hífen e ponto
  // ficam, porque fazem parte de código de produto ("prod-001") e de medida.
  const words = [
    ...new Set(normalizeSearchText(text).split(/[^\p{L}\p{N}.-]+/u)),
  ].filter(Boolean);
  const meaningful = words.filter((word) => word.length >= 3);
  return (meaningful.length > 0 ? meaningful : words).slice(
    0,
    MAX_SEARCH_TOKENS,
  );
}

/**
 * Escapa os curingas do LIKE (`%`, `_` e a própria barra, que é o escape
 * padrão do PostgreSQL): o termo do visitante é texto, não padrão.
 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
