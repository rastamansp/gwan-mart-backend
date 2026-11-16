import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from '../products/products.module';
import { SeoController } from './seo.controller';

/**
 * Prévia de link (Open Graph) por produto e sitemap da loja. Isolado do
 * módulo de produtos: só consome os casos de uso que ele exporta.
 */
@Module({
  imports: [ConfigModule, ProductsModule],
  controllers: [SeoController],
})
export class SeoModule {}
