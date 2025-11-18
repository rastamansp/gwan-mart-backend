import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProductsController } from './infra/products.controller';
import { ProductsService } from './infra/products.service';
import { LoggingService } from '@/shared/infrastructure/logger/logging.service';
import { TelemetryService } from '@/shared/infrastructure/telemetry/telemetry.service';

// Entities
import { Product } from './domain/entities/product.entity';
import { ProductImage } from './domain/entities/product-image.entity';
import { ProductChunk } from './domain/entities/product-chunk.entity';

// Repositories
import { TypeOrmProductRepository } from './infrastructure/repositories/typeorm-product.repository';
import { TypeOrmProductChunkRepository } from './infrastructure/repositories/typeorm-product-chunk.repository';

// Services
import { OpenAIService } from '@/shared/infrastructure/services/openai.service';

// Use Cases
import {
  CreateProductUseCase,
  GetProductByIdUseCase,
  GetProductByCodeUseCase,
  GetAllProductsUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
  GetFeaturedProductsUseCase,
  GetProductsWithFiltersUseCase,
  GetAllProductsForCatalogUseCase,
  ProcessProductsIntoChunksUseCase,
  ProcessAndSaveProductsToVectorDBUseCase,
} from './application/use-cases';

/**
 * Módulo de Produtos
 * Seguindo Clean Architecture - isolamento por domínio
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, ProductChunk]),
    ConfigModule,
  ],
  controllers: [ProductsController],
  providers: [
    // Use Cases
    CreateProductUseCase,
    GetProductByIdUseCase,
    GetProductByCodeUseCase,
    GetAllProductsUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    GetFeaturedProductsUseCase,
    GetProductsWithFiltersUseCase,
    GetAllProductsForCatalogUseCase,
    ProcessProductsIntoChunksUseCase,
    ProcessAndSaveProductsToVectorDBUseCase,

    // Repositories
    TypeOrmProductRepository,
    TypeOrmProductChunkRepository,
    {
      provide: 'IProductRepository',
      useClass: TypeOrmProductRepository,
    },
    {
      provide: 'IProductChunkRepository',
      useClass: TypeOrmProductChunkRepository,
    },

    // Services
    ProductsService,
    OpenAIService,
    LoggingService,
    TelemetryService,
  ],
  exports: [
    // Use Cases
    CreateProductUseCase,
    GetProductByIdUseCase,
    GetAllProductsUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    GetFeaturedProductsUseCase,
    GetProductsWithFiltersUseCase,
    GetAllProductsForCatalogUseCase,
    ProcessProductsIntoChunksUseCase,
    ProcessAndSaveProductsToVectorDBUseCase,

    // Services
    ProductsService,
    OpenAIService,
  ],
})
export class ProductsModule {}
