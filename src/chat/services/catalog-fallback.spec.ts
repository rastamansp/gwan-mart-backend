import { buildCatalogFallbackAnswer, catalogQueryFromMessage } from './catalog-fallback';

const url = (code: string) => `https://mart.gwan.cloud/product/${code}`;

describe('catalogQueryFromMessage', () => {
  it('tira as palavras de conversa e mantém o que descreve o produto', () => {
    expect(catalogQueryFromMessage('Vocês têm fone de ouvido?')).toBe('fone de ouvido');
    expect(catalogQueryFromMessage('Oi, quero comprar uma caneca térmica')).toBe('caneca termica');
  });

  it('devolve vazio quando a mensagem é só conversa', () => {
    expect(catalogQueryFromMessage('Olá, bom dia! Tudo bem?')).toBe('');
    expect(catalogQueryFromMessage('Quais produtos vocês têm?')).toBe('');
  });

  it('preserva código de produto', () => {
    expect(catalogQueryFromMessage('tem o TST-FONE-PULSE?')).toBe('tst-fone-pulse');
  });
});

describe('buildCatalogFallbackAnswer', () => {
  const fone = {
    code: 'TST-FONE',
    name: 'Fone Pulse',
    stock: 3,
    originalPrice: '249.90',
    promotionalPrice: '199.90',
  };
  const luminaria = { code: 'TST-LUZ', name: 'Luminária', stock: 0, originalPrice: 149.9, promotionalPrice: null };

  it('lista o que casou, com link, preço promocional e falta de estoque', () => {
    const answer = buildCatalogFallbackAnswer({
      query: 'fone',
      matches: [fone, luminaria],
      featured: [],
      productUrl: url,
    });
    expect(answer).toContain('fora do ar');
    expect(answer).toContain('[Fone Pulse](https://mart.gwan.cloud/product/TST-FONE)');
    expect(answer).toMatch(/R\$\s?199,90 \(de R\$\s?249,90\)/);
    expect(answer).toContain('Luminária');
    expect(answer).toContain('sem estoque');
  });

  it('sem resultado, avisa e mostra os destaques', () => {
    const answer = buildCatalogFallbackAnswer({
      query: 'geladeira',
      matches: [],
      featured: [fone],
      productUrl: url,
    });
    expect(answer).toContain('Não encontrei nada para **geladeira**');
    expect(answer).toContain('destaques');
    expect(answer).toContain('Fone Pulse');
  });

  it('catálogo vazio não inventa produto', () => {
    const answer = buildCatalogFallbackAnswer({ query: '', matches: [], featured: [], productUrl: url });
    expect(answer).toContain('Me diga o nome');
    expect(answer).not.toContain('](');
  });
});
