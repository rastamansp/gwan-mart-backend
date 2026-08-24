/**
 * Monta a URL publica de um produto para os links que o bot devolve.
 *
 * O Gwan Mart nao tem site proprio: o front dele e a area /gwan-mart do site
 * institucional (repo gwan-ia). A rota de produto la e
 * `/gwan-mart/product/:productCode` — nao `/products/:code`.
 *
 * O fork do gwan-imoveis-backend deixou os formatters montando
 * `${frontendUrl}products/${code}` sobre um default `https://mart.gwan.com.br/`,
 * dominio que nao existe. Todo link "Ver detalhes" do chat dava 404.
 *
 * Base e path sao configuraveis (FRONTEND_URL / FRONTEND_PRODUCT_PATH) para que
 * dev (http://localhost:5173) e producao (https://gwan.cloud) usem o mesmo codigo.
 */
export function buildProductUrl(
  baseUrl: string,
  productPath: string,
  code: string,
): string {
  const base = baseUrl.replace(/\/+$/, '');
  const path = productPath.replace(/^\/+|\/+$/g, '');
  return `${base}/${path}/${encodeURIComponent(code)}`;
}
