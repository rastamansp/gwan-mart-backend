import { Controller, Get, Header, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  GetAllProductsUseCase,
  GetProductByCodeUseCase,
} from '../products/application/use-cases';
import { buildProductHead, buildSitemap, SeoSite } from './seo-html';

/**
 * Rotas de SEO da loja. Quem chama é o nginx da loja (rede interna da stack),
 * não o navegador: o SSI pede o trecho de <head> de cada página de produto, e
 * /sitemap.xml é repassado para cá. Ver
 * openspec/changes/add-storefront-seo/design.md.
 *
 * Fora do Swagger de propósito: devolve HTML/XML para o servidor da loja, não
 * é API pública. (Também não vira tool do bot — o conversor OpenAPI→MCP só
 * inclui operações com x-mcp.enabled.)
 */
@ApiExcludeController()
@Controller('seo')
export class SeoController {
  private readonly site: SeoSite;

  constructor(
    private readonly getProductByCode: GetProductByCodeUseCase,
    private readonly getAllProducts: GetAllProductsUseCase,
    configService: ConfigService,
  ) {
    // As mesmas variáveis dos links do bot (buildProductUrl). Os defaults são
    // os da loja, porque é ela quem serve estas páginas.
    this.site = {
      baseUrl:
        configService.get<string>('FRONTEND_URL') || 'https://mart.gwan.cloud',
      productPath:
        configService.get<string>('FRONTEND_PRODUCT_PATH') || 'product',
    };
  }

  /** 404 (via use case) para produto inexistente ou inativo — o nginx cai nas meta padrão. */
  @Get('products/:code/head')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  async productHead(@Param('code') code: string): Promise<string> {
    const product = await this.getProductByCode.execute(code);
    return buildProductHead(product, this.site);
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  async sitemap(): Promise<string> {
    const products = await this.getAllProducts.execute();
    return buildSitemap(products, this.site);
  }
}
