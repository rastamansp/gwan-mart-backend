/**
 * Pedido por WhatsApp.
 *
 * É o único caminho de compra que existe: a API não tem carrinho nem checkout, e
 * o fechamento acontece na conversa com o atendente. Por isso a mensagem precisa
 * chegar completa — produto identificado pelo código, quantidade, origem, CEP e
 * variação — para o atendente não ter que perguntar tudo de novo.
 *
 * O número vem de `VITE_WHATSAPP_NUMBER`. Na versão do site institucional ele
 * está escrito no código: trocar exige rebuild, e o contato viaja em qualquer
 * cópia do repositório.
 */

export interface WhatsAppOrder {
  productName: string;
  productCode: string;
  quantity: number;
  origin: string;
  price?: number;
  variation?: string;
  zipCode?: string;
  /** Endereço da página do produto, para o atendente abrir o mesmo item. */
  productUrl?: string;
}

/** Só dígitos, como o wa.me exige (ex.: 5511987221050). */
export function whatsappNumber(): string | null {
  const raw = import.meta.env.VITE_WHATSAPP_NUMBER;
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

export function buildOrderMessage(order: WhatsAppOrder): string {
  const lines = [
    '🛒 *PEDIDO — GWAN MART*',
    '',
    `📦 *Produto:* ${order.productName}`,
    `🔖 *Código:* ${order.productCode}`,
  ];

  if (order.variation) lines.push(`🎨 *Opção:* ${order.variation}`);
  lines.push(`🔢 *Quantidade:* ${order.quantity}`);
  lines.push(`🚚 *Origem do frete:* ${order.origin}`);
  if (order.zipCode) lines.push(`📍 *CEP de entrega:* ${order.zipCode}`);

  if (typeof order.price === 'number') {
    const unit = order.price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const total = (order.price * order.quantity).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    lines.push(`💰 *Preço unitário:* ${unit}`);
    if (order.quantity > 1) lines.push(`💵 *Total:* ${total}`);
  }

  if (order.productUrl) lines.push('', `🔗 ${order.productUrl}`);

  lines.push('', 'Olá! Gostaria de fazer este pedido. Podem me ajudar?');

  return lines.join('\n');
}

/** URL do wa.me, ou null quando não há número configurado. */
export function buildOrderUrl(order: WhatsAppOrder): string | null {
  const number = whatsappNumber();
  if (!number) return null;

  return `https://wa.me/${number}?text=${encodeURIComponent(buildOrderMessage(order))}`;
}

/** Máscara 00000-000, aplicada enquanto o visitante digita. */
export function formatZipCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Cidades de origem oferecidas — mesma lista do site institucional. */
export const SHIPPING_ORIGINS = [
  'São Paulo - SP',
  'Rio de Janeiro - RJ',
  'Belo Horizonte - MG',
  'Brasília - DF',
  'Salvador - BA',
  'Fortaleza - CE',
  'Manaus - AM',
  'Curitiba - PR',
] as const;
