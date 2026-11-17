/**
 * Resposta do assistente quando o provedor de IA não responde.
 *
 * O chat depende de um LLM pago (Claude ou OpenAI). Sem crédito, com a chave
 * revogada ou com o provedor fora, a loja mostrava "A API respondeu 500" — e o
 * visitante que perguntou "vocês têm fone?" ficava sem nada. Aqui a pergunta
 * vira busca textual no catálogo e a resposta lista o que existe, com link.
 *
 * Funções puras: quem busca e quem monta a URL fica no ChatService.
 */
import { normalizeSearchText } from '../../products/domain/text-search';

/**
 * Palavras de conversa que não descrevem produto. Sem tirá-las, "vocês têm
 * fone?" buscaria também "voces" e "tem" — o que não casa com nada, mas
 * "produto" ou "loja" casariam com qualquer descrição.
 */
const CONVERSATION_WORDS = new Set(
  [
    'voce', 'voces', 'tem', 'tens', 'ter', 'teria', 'possui', 'possuem',
    'quero', 'queria', 'gostaria', 'procuro', 'procurando', 'preciso',
    'comprar', 'compra', 'vende', 'vendem', 'vender', 'vendas',
    'algum', 'alguma', 'alguns', 'algumas', 'qual', 'quais', 'quanto',
    'quantos', 'custa', 'preco', 'precos', 'valor', 'barato', 'barata',
    'produto', 'produtos', 'item', 'itens', 'loja', 'catalogo',
    'mostre', 'mostra', 'mostrar', 'liste', 'lista', 'listar', 'ver',
    'me', 'para', 'pra', 'com', 'sem', 'uma', 'uns', 'umas', 'por', 'favor',
    'ola', 'oi', 'bom', 'boa', 'dia', 'tarde', 'noite', 'tudo', 'bem',
    'que', 'como', 'onde', 'estoque', 'disponivel', 'disponiveis', 'ai',
  ].map(normalizeSearchText),
);

/** Termo de busca extraído da mensagem; vazio quando ela é só conversa. */
export function catalogQueryFromMessage(message: string): string {
  return normalizeSearchText(message)
    .split(/[^\p{L}\p{N}.-]+/u)
    .filter((word) => word.length >= 2 && !CONVERSATION_WORDS.has(word))
    .join(' ');
}

export interface FallbackProduct {
  code: string;
  name: string;
  stock: number;
  originalPrice: number | string;
  promotionalPrice?: number | string | null;
}

function brl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function priceText(product: FallbackProduct): string {
  const original = Number(product.originalPrice);
  const promo = Number(product.promotionalPrice ?? 0);
  return promo > 0 && promo < original
    ? `${brl(promo)} (de ${brl(original)})`
    : brl(original);
}

function productLine(product: FallbackProduct, productUrl: (code: string) => string): string {
  const stock = product.stock > 0 ? '' : ' — sem estoque no momento';
  return `- [${product.name}](${productUrl(product.code)}) — ${priceText(product)}${stock}`;
}

/**
 * Monta a resposta em markdown (a loja renderiza com react-markdown).
 *
 * @param matches  produtos que casaram com a busca
 * @param featured destaques, usados só quando a busca não achou nada
 */
export function buildCatalogFallbackAnswer(params: {
  query: string;
  matches: FallbackProduct[];
  featured: FallbackProduct[];
  productUrl: (code: string) => string;
}): string {
  const { query, matches, featured, productUrl } = params;
  const intro = 'Nosso assistente está fora do ar agora, então consultei o catálogo direto.';
  const outro = 'Para tirar dúvidas ou fechar o pedido, fale com a gente pelo WhatsApp na página do produto.';

  if (matches.length > 0) {
    return [
      intro,
      '',
      `Encontrei isto para **${query}**:`,
      '',
      ...matches.map((p) => productLine(p, productUrl)),
      '',
      outro,
    ].join('\n');
  }

  const notFound = query
    ? `Não encontrei nada para **${query}**.`
    : 'Me diga o nome ou o tipo de produto que você procura.';

  if (featured.length > 0) {
    return [
      intro,
      '',
      `${notFound} Estes são alguns destaques da loja:`,
      '',
      ...featured.map((p) => productLine(p, productUrl)),
      '',
      outro,
    ].join('\n');
  }

  return [intro, '', notFound, '', outro].join('\n');
}
