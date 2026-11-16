import {
  buildProductHead,
  buildSitemap,
  escapeHtml,
  productDescription,
  productImageUrl,
  SeoProduct,
  SeoSite,
} from './seo-html';

const site: SeoSite = { baseUrl: 'https://mart.gwan.cloud/', productPath: 'product' };

function product(overrides: Partial<SeoProduct> = {}): SeoProduct {
  return {
    code: 'PROD-001',
    name: 'Smartphone XYZ',
    description: 'Tela de 6,5 polegadas e 128GB.',
    originalPrice: '999.00',
    promotionalPrice: null,
    realImage: 'https://minio.gwan.cloud/gwan-mart-uploads/prod-001.jpg',
    thumbnail: '',
    images: [],
    isActive: true,
    updatedAt: new Date('2026-11-01T12:00:00Z'),
    ...overrides,
  };
}

/** Valor do atributo content de uma meta, já desescapado só de &quot;. */
function metaContent(html: string, key: string): string | undefined {
  const match = html.match(
    new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)" />`),
  );
  return match?.[1];
}

describe('escapeHtml', () => {
  it('escapa as cinco entidades', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('buildProductHead', () => {
  it('traz título, URL do produto (mesma do bot), imagem e card', () => {
    const html = buildProductHead(product(), site);

    expect(html).toContain('<title>Smartphone XYZ | Gwan Mart</title>');
    expect(metaContent(html, 'og:url')).toBe(
      'https://mart.gwan.cloud/product/PROD-001',
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://mart.gwan.cloud/product/PROD-001" />',
    );
    expect(metaContent(html, 'og:image')).toBe(
      'https://minio.gwan.cloud/gwan-mart-uploads/prod-001.jpg',
    );
    expect(metaContent(html, 'og:type')).toBe('product');
    expect(metaContent(html, 'twitter:card')).toBe('summary_large_image');
    expect(metaContent(html, 'product:price:amount')).toBe('999.00');
  });

  it('escapa nome e descrição vindos do catálogo', () => {
    const html = buildProductHead(
      product({
        name: 'Cabo "USB" <script>alert(1)</script> & cia',
        description: `Diz "olá" e 'tchau' > <b>`,
      }),
      site,
    );

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain(
      '<title>Cabo &quot;USB&quot; &lt;script&gt;alert(1)&lt;/script&gt; &amp; cia | Gwan Mart</title>',
    );
    // Nenhuma aspa crua dentro de atributo: cada meta continua com um content só.
    for (const line of html.trim().split('\n')) {
      if (line.includes('<meta')) {
        expect(line.trim()).toMatch(/^<meta (name|property)="[^"]+" content="[^"]*" \/>$/);
      }
    }
  });

  it('cai na imagem padrão da loja quando o produto só tem caminho relativo', () => {
    const html = buildProductHead(
      product({ realImage: '/uploads/x.jpg', thumbnail: 'x.jpg', images: [] }),
      site,
    );

    expect(metaContent(html, 'og:image')).toBe(
      'https://mart.gwan.cloud/og-default.png',
    );
    expect(metaContent(html, 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'og:image:height')).toBe('630');
  });

  it('codifica o código do produto na URL', () => {
    const html = buildProductHead(product({ code: 'PROD 01/A' }), site);
    expect(metaContent(html, 'og:url')).toBe(
      'https://mart.gwan.cloud/product/PROD%2001%2FA',
    );
  });
});

describe('productImageUrl', () => {
  it('usa a galeria ativa, por ordem, quando faltam realImage e thumbnail', () => {
    expect(
      productImageUrl(
        product({
          realImage: '',
          thumbnail: null,
          images: [
            { url: 'https://img/3.jpg', order: 3, isActive: true },
            { url: 'https://img/1.jpg', order: 1, isActive: false },
            { url: 'https://img/2.jpg', order: 2, isActive: true },
          ],
        }),
      ),
    ).toBe('https://img/2.jpg');
  });
});

describe('productDescription', () => {
  it('mostra o preço promocional com o original quando ele é menor', () => {
    const text = productDescription(
      product({ originalPrice: '999.00', promotionalPrice: '799.00' }),
    );
    expect(text).toMatch(/^R\$\s799,00 \(de R\$\s999,00\) — Tela de 6,5/);
  });

  it('ignora promocional maior que o original', () => {
    const text = productDescription(
      product({ originalPrice: 100, promotionalPrice: 150 }),
    );
    expect(text).toMatch(/^R\$\s100,00 — /);
  });

  it('corta descrição longa no tamanho da prévia', () => {
    const text = productDescription(
      product({ description: 'palavra '.repeat(100) }),
    );
    expect(text.length).toBeLessThanOrEqual(200);
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('buildSitemap', () => {
  it('lista home, catálogo e só os produtos ativos', () => {
    const xml = buildSitemap(
      [
        product({ code: 'PROD-001' }),
        product({ code: 'PROD-002', isActive: false }),
        product({ code: 'A&B', updatedAt: null }),
      ],
      site,
    );

    expect(xml).toContain('<loc>https://mart.gwan.cloud/</loc>');
    expect(xml).toContain('<loc>https://mart.gwan.cloud/catalog</loc>');
    expect(xml).toContain(
      '<url><loc>https://mart.gwan.cloud/product/PROD-001</loc><lastmod>2026-11-01T12:00:00.000Z</lastmod></url>',
    );
    expect(xml).not.toContain('PROD-002');
    expect(xml).toContain('<loc>https://mart.gwan.cloud/product/A%26B</loc>');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });
});
