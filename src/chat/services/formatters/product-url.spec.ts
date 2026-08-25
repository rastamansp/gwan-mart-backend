import { buildProductUrl } from './product-url';

/**
 * O link "Ver detalhes" que o bot devolve já apontou para
 * `https://mart.gwan.com.br/products/PROD-001` — domínio que nunca existiu e
 * rota que não bate com a real (`/gwan-mart/product/:code`, na área do Mart
 * dentro do site institucional). Estes testes fixam o contrato.
 */
describe('buildProductUrl', () => {
  it('monta a URL no formato consumido pelo front do Mart', () => {
    expect(
      buildProductUrl('https://gwan.cloud', 'gwan-mart/product', 'PROD-001'),
    ).toBe('https://gwan.cloud/gwan-mart/product/PROD-001');
  });

  it('não duplica barras quando a base termina com "/"', () => {
    expect(
      buildProductUrl('http://localhost:5173/', 'gwan-mart/product', 'PROD-005'),
    ).toBe('http://localhost:5173/gwan-mart/product/PROD-005');
  });

  it('tolera caminho com barras nas pontas', () => {
    expect(
      buildProductUrl('https://gwan.cloud', '/gwan-mart/product/', 'PROD-002'),
    ).toBe('https://gwan.cloud/gwan-mart/product/PROD-002');
  });

  it('escapa código com caractere especial, para não quebrar a URL', () => {
    expect(
      buildProductUrl('https://gwan.cloud', 'gwan-mart/product', 'PROD 01/A'),
    ).toBe('https://gwan.cloud/gwan-mart/product/PROD%2001%2FA');
  });
});
