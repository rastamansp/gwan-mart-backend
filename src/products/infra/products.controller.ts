import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiExtension,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
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
} from '../application/use-cases';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFiltersDto,
} from '../application/dto/product.dto';
import { BaseResponseDto } from '@/shared/application/dto/base-response.dto';
import { RequestId } from '@/shared/infrastructure/logger/request-id.decorator';
import { OpenAIService } from '@/shared/infrastructure/services/openai.service';
import { IProductChunkRepository } from '../infrastructure/repositories/typeorm-product-chunk.repository';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
    private readonly getProductByCodeUseCase: GetProductByCodeUseCase,
    private readonly getAllProductsUseCase: GetAllProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly getFeaturedProductsUseCase: GetFeaturedProductsUseCase,
    private readonly getProductsWithFiltersUseCase: GetProductsWithFiltersUseCase,
    private readonly getAllProductsForCatalogUseCase: GetAllProductsForCatalogUseCase,
    private readonly processProductsIntoChunksUseCase: ProcessProductsIntoChunksUseCase,
    private readonly processAndSaveProductsToVectorDBUseCase: ProcessAndSaveProductsToVectorDBUseCase,
    private readonly openaiService: OpenAIService,
    @Inject('IProductChunkRepository')
    private readonly chunkRepository: IProductChunkRepository,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Criar novo produto',
    description: 'Cria um novo produto no sistema. Requer autenticação JWT.',
  })
  @ApiBody({
    description: 'Dados do produto para criação',
    schema: {
      type: 'object',
      required: [
        'code',
        'name',
        'description',
        'ncm',
        'stock',
        'costPrice',
        'supplier',
        'gtinEan',
        'gtinEanPackage',
        'supplierProductDescription',
        'thumbnail',
        'category',
        'subcategory',
        'originalPrice',
        'realImage',
      ],
      properties: {
        code: {
          type: 'string',
          description: 'Código único do produto',
          example: 'PROD-001',
        },
        name: {
          type: 'string',
          description: 'Nome do produto',
          example: 'Smartphone XYZ',
        },
        description: {
          type: 'string',
          description: 'Descrição detalhada do produto',
          example: 'Smartphone com tela de 6.1 polegadas',
        },
        ncm: {
          type: 'string',
          description: 'Código NCM do produto',
          example: '85171200',
        },
        stock: {
          type: 'number',
          description: 'Quantidade em estoque',
          minimum: 0,
          example: 100,
        },
        costPrice: {
          type: 'number',
          description: 'Preço de custo do produto',
          minimum: 0,
          example: 500.0,
        },
        supplier: {
          type: 'string',
          description: 'Nome do fornecedor',
          example: 'Fornecedor ABC',
        },
        gtinEan: {
          type: 'string',
          description: 'Código GTIN/EAN do produto',
          example: '1234567890123',
        },
        gtinEanPackage: {
          type: 'string',
          description: 'Código GTIN/EAN da embalagem',
          example: '1234567890123',
        },
        supplierProductDescription: {
          type: 'string',
          description: 'Descrição do produto fornecida pelo fornecedor',
          example: 'Descrição técnica detalhada',
        },
        thumbnail: {
          type: 'string',
          format: 'url',
          description: 'URL da imagem thumbnail',
          example: 'https://example.com/thumb.jpg',
        },
        realImage: {
          type: 'string',
          format: 'url',
          description: 'URL da imagem principal do produto',
          example: 'https://example.com/image.jpg',
        },
        category: {
          type: 'string',
          description: 'Categoria do produto',
          example: 'Eletrônicos',
        },
        subcategory: {
          type: 'string',
          description: 'Subcategoria do produto',
          example: 'Smartphones',
        },
        originalPrice: {
          type: 'number',
          description: 'Preço original do produto',
          minimum: 0,
          example: 800.0,
        },
        promotionalPrice: {
          type: 'number',
          description: 'Preço promocional (opcional)',
          minimum: 0,
          example: 700.0,
        },
        discountPercentage: {
          type: 'number',
          description: 'Percentual de desconto',
          minimum: 0,
          maximum: 100,
          example: 12.5,
        },
        averageRating: {
          type: 'number',
          description: 'Avaliação média do produto',
          minimum: 0,
          maximum: 5,
          example: 0.0,
        },
        totalReviews: {
          type: 'number',
          description: 'Total de avaliações recebidas',
          minimum: 0,
          example: 0,
        },
        variations: {
          type: 'array',
          description: 'Variações do produto (cores, tamanhos, etc.)',
          items: {
            type: 'object',
          },
          example: [
            { color: 'Preto', size: '128GB' },
            { color: 'Branco', size: '256GB' },
          ],
        },
        isActive: {
          type: 'boolean',
          description: 'Status ativo/inativo do produto',
          example: true,
        },
        isFeatured: {
          type: 'boolean',
          description: 'Produto em destaque',
          example: false,
        },
        images: {
          type: 'array',
          description: 'Array de URLs de imagens adicionais',
          items: {
            type: 'string',
            format: 'url',
          },
          example: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Produto criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Smartphone XYZ' },
            code: { type: 'string', example: 'PROD-001' },
            description: { type: 'string' },
            originalPrice: { type: 'number', example: 800.0 },
            promotionalPrice: { type: 'number', example: 700.0 },
            stock: { type: 'number', example: 100 },
            isActive: { type: 'boolean', example: true },
            isFeatured: { type: 'boolean', example: false },
            category: { type: 'string', example: 'Eletrônicos' },
            subcategory: { type: 'string', example: 'Smartphones' },
            supplier: { type: 'string', example: 'Fornecedor ABC' },
            realImage: {
              type: 'string',
              example: 'https://example.com/image.jpg',
            },
            thumbnail: {
              type: 'string',
              example: 'https://example.com/thumb.jpg',
            },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  url: { type: 'string' },
                  alt: { type: 'string' },
                  order: { type: 'number' },
                  isActive: { type: 'boolean' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Dados inválidos' },
            details: { type: 'array', items: { type: 'string' } },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token JWT inválido ou ausente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
            statusCode: { type: 'number', example: 401 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito - Código do produto já existe',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Código do produto já existe' },
            statusCode: { type: 'number', example: 409 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @RequestId() _requestId: string,
  ): Promise<BaseResponseDto<any>> {
    const result = await this.createProductUseCase.execute(createProductDto);
    return BaseResponseDto.success(result);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Importar múltiplos produtos',
    description:
      'Importa múltiplos produtos em lote. Não requer autenticação. Útil para migração de dados ou importação em massa.',
  })
  @ApiBody({
    description: 'Array de produtos para importação',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'code',
          'name',
          'description',
          'ncm',
          'stock',
          'costPrice',
          'supplier',
          'gtinEan',
          'gtinEanPackage',
          'supplierProductDescription',
          'thumbnail',
          'category',
          'subcategory',
          'originalPrice',
          'realImage',
        ],
        properties: {
          code: { type: 'string', example: 'PROD-001' },
          name: { type: 'string', example: 'Smartphone XYZ' },
          description: {
            type: 'string',
            example: 'Smartphone com tela de 6.1 polegadas',
          },
          ncm: { type: 'string', example: '85171200' },
          stock: { type: 'number', example: 100 },
          costPrice: { type: 'number', example: 500.0 },
          supplier: { type: 'string', example: 'Fornecedor ABC' },
          gtinEan: { type: 'string', example: '1234567890123' },
          gtinEanPackage: { type: 'string', example: '1234567890123' },
          supplierProductDescription: { type: 'string' },
          thumbnail: {
            type: 'string',
            format: 'url',
            example: 'https://example.com/thumb.jpg',
          },
          category: { type: 'string', example: 'Eletrônicos' },
          subcategory: { type: 'string', example: 'Smartphones' },
          originalPrice: { type: 'number', example: 800.0 },
          realImage: {
            type: 'string',
            format: 'url',
            example: 'https://example.com/image.jpg',
          },
          promotionalPrice: { type: 'number', example: 700.0 },
          discountPercentage: { type: 'number', example: 12.5 },
          isActive: { type: 'boolean', example: true },
          isFeatured: { type: 'boolean', example: false },
          images: {
            type: 'array',
            items: { type: 'string', format: 'url' },
            example: [
              'https://example.com/image1.jpg',
              'https://example.com/image2.jpg',
            ],
          },
        },
      },
      example: [
        {
          code: 'PROD-001',
          name: 'Smartphone XYZ',
          description: 'Smartphone com tela de 6.1 polegadas',
          ncm: '85171200',
          stock: 100,
          costPrice: 500.0,
          supplier: 'Fornecedor ABC',
          gtinEan: '1234567890123',
          gtinEanPackage: '1234567890123',
          supplierProductDescription: 'Descrição técnica',
          thumbnail: 'https://example.com/thumb.jpg',
          category: 'Eletrônicos',
          subcategory: 'Smartphones',
          originalPrice: 800.0,
          realImage: 'https://example.com/image.jpg',
        },
        {
          code: 'PROD-002',
          name: 'Notebook ABC',
          description: 'Notebook gamer com placa de vídeo dedicada',
          ncm: '84713000',
          stock: 50,
          costPrice: 2000.0,
          supplier: 'Fornecedor XYZ',
          gtinEan: '9876543210987',
          gtinEanPackage: '9876543210987',
          supplierProductDescription: 'Especificações técnicas',
          thumbnail: 'https://example.com/notebook-thumb.jpg',
          category: 'Informática',
          subcategory: 'Notebooks',
          originalPrice: 3000.0,
          realImage: 'https://example.com/notebook.jpg',
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Produtos importados com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              example: 2,
              description: 'Total de produtos enviados',
            },
            success: {
              type: 'number',
              example: 2,
              description: 'Produtos importados com sucesso',
            },
            errorCount: {
              type: 'number',
              example: 0,
              description: 'Produtos com erro na importação',
            },
            results: {
              type: 'array',
              description: 'Produtos importados com sucesso',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number', example: 0 },
                  product: { type: 'object' },
                  status: { type: 'string', example: 'success' },
                },
              },
            },
            errors: {
              type: 'array',
              description: 'Produtos com erro na importação',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number', example: 1 },
                  product: { type: 'object' },
                  error: {
                    type: 'string',
                    example: 'Código do produto já existe',
                  },
                  status: { type: 'string', example: 'error' },
                },
              },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou array vazio',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Array de produtos não pode estar vazio',
            },
            statusCode: { type: 'number', example: 400 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async importProducts(
    @Body() productsData: CreateProductDto[],
    @RequestId() _requestId: string,
  ): Promise<BaseResponseDto<any>> {
    const results = [];
    const errors = [];

    for (let i = 0; i < productsData.length; i++) {
      try {
        const result = await this.createProductUseCase.execute(productsData[i]);
        results.push({
          index: i,
          product: result,
          status: 'success',
        });
      } catch (error) {
        errors.push({
          index: i,
          product: productsData[i],
          error: error.message,
          status: 'error',
        });
      }
    }

    return BaseResponseDto.success({
      total: productsData.length,
      success: results.length,
      errorCount: errors.length,
      results,
      errors,
    });
  }

  @Get()
  @ApiExtension('x-mcp', {
    enabled: true,
    toolName: 'list_products',
    description: 'Lista produtos com filtros opcionais (categoria, subcategoria, preço, busca por texto)',
  })
  @ApiOperation({
    summary: 'Listar produtos com filtros e paginação',
    description:
      'Lista produtos com filtros avançados, paginação e ordenação. Todos os parâmetros são opcionais.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrar por categoria do produto',
    example: 'Eletrônicos',
  })
  @ApiQuery({
    name: 'subcategory',
    required: false,
    description: 'Filtrar por subcategoria do produto',
    example: 'Smartphones',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Preço mínimo para filtrar',
    type: 'number',
    example: 100,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Preço máximo para filtrar',
    type: 'number',
    example: 1000,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Termo de busca (nome, descrição, código)',
    example: 'smartphone',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número da página (padrão: 1)',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (padrão: 10, máximo: 100)',
    type: 'number',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Campo para ordenação (name, price, createdAt, updatedAt)',
    example: 'name',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Ordem da ordenação (asc, desc)',
    enum: ['asc', 'desc'],
    example: 'asc',
  })
  @ApiResponse({
    status: 200,
    description: 'Produtos listados com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'Smartphone XYZ' },
                  code: { type: 'string', example: 'PROD-001' },
                  description: { type: 'string' },
                  originalPrice: { type: 'number', example: 800.0 },
                  promotionalPrice: { type: 'number', example: 700.0 },
                  stock: { type: 'number', example: 100 },
                  isActive: { type: 'boolean', example: true },
                  isFeatured: { type: 'boolean', example: false },
                  category: { type: 'string', example: 'Eletrônicos' },
                  subcategory: { type: 'string', example: 'Smartphones' },
                  supplier: { type: 'string', example: 'Fornecedor ABC' },
                  realImage: {
                    type: 'string',
                    example: 'https://example.com/image.jpg',
                  },
                  thumbnail: {
                    type: 'string',
                    example: 'https://example.com/thumb.jpg',
                  },
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        url: { type: 'string' },
                        alt: { type: 'string' },
                        order: { type: 'number' },
                        isActive: { type: 'boolean' },
                      },
                    },
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                total: { type: 'number', example: 25 },
                totalPages: { type: 'number', example: 3 },
                hasNext: { type: 'boolean', example: true },
                hasPrev: { type: 'boolean', example: false },
              },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getProducts(
    @Query() filters: ProductFiltersDto,
    @RequestId() _requestId: string,
  ): Promise<BaseResponseDto<any>> {
    const result = await this.getProductsWithFiltersUseCase.execute(filters);
    return BaseResponseDto.success(result);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Listar todos os produtos',
    description:
      'Lista todos os produtos ativos do sistema sem filtros ou paginação. Útil para obter uma visão geral completa do catálogo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Todos os produtos listados com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Smartphone XYZ' },
              code: { type: 'string', example: 'PROD-001' },
              description: { type: 'string' },
              originalPrice: { type: 'number', example: 800.0 },
              promotionalPrice: { type: 'number', example: 700.0 },
              stock: { type: 'number', example: 100 },
              isActive: { type: 'boolean', example: true },
              isFeatured: { type: 'boolean', example: false },
              category: { type: 'string', example: 'Eletrônicos' },
              subcategory: { type: 'string', example: 'Smartphones' },
              supplier: { type: 'string', example: 'Fornecedor ABC' },
              realImage: {
                type: 'string',
                example: 'https://example.com/image.jpg',
              },
              thumbnail: {
                type: 'string',
                example: 'https://example.com/thumb.jpg',
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getAllProducts(
    @RequestId() _requestId: string,
  ): Promise<BaseResponseDto<any>> {
    const result = await this.getAllProductsUseCase.execute();
    return BaseResponseDto.success(result);
  }

  @Get('featured')
  @ApiOperation({
    summary: 'Listar produtos em destaque',
    description:
      'Lista produtos marcados como em destaque (isFeatured = true). Útil para exibir produtos promocionais ou recomendados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Produtos em destaque listados com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Smartphone XYZ Pro' },
              code: { type: 'string', example: 'PROD-001' },
              description: { type: 'string' },
              originalPrice: { type: 'number', example: 999.0 },
              promotionalPrice: { type: 'number', example: 799.0 },
              discountPercentage: { type: 'number', example: 20.0 },
              stock: { type: 'number', example: 50 },
              isActive: { type: 'boolean', example: true },
              isFeatured: { type: 'boolean', example: true },
              category: { type: 'string', example: 'Eletrônicos' },
              subcategory: { type: 'string', example: 'Smartphones' },
              supplier: { type: 'string', example: 'Fornecedor ABC' },
              realImage: {
                type: 'string',
                example: 'https://example.com/featured-image.jpg',
              },
              thumbnail: {
                type: 'string',
                example: 'https://example.com/featured-thumb.jpg',
              },
              averageRating: { type: 'number', example: 4.8 },
              totalReviews: { type: 'number', example: 150 },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getFeaturedProducts(
    @RequestId() _requestId: string,
  ): Promise<BaseResponseDto<any>> {
    const result = await this.getFeaturedProductsUseCase.execute();
    return BaseResponseDto.success(result);
  }

  @Get(':code')
  @ApiExtension('x-mcp', {
    enabled: true,
    toolName: 'get_product_by_code',
    description: 'Busca um produto específico pelo código',
  })
  @ApiOperation({
    summary: 'Buscar produto por código',
    description:
      'Busca um produto específico pelo seu código único. Não requer autenticação.',
  })
  @ApiParam({
    name: 'code',
    description: 'Código único do produto',
    type: 'string',
    example: 'PROD-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Smartphone XYZ' },
            code: { type: 'string', example: 'PROD-001' },
            description: { type: 'string' },
            ncm: { type: 'string', example: '85171200' },
            stock: { type: 'number', example: 100 },
            costPrice: { type: 'number', example: 500.0 },
            supplier: { type: 'string', example: 'Fornecedor ABC' },
            gtinEan: { type: 'string', example: '1234567890123' },
            gtinEanPackage: { type: 'string', example: '1234567890123' },
            supplierProductDescription: { type: 'string' },
            thumbnail: {
              type: 'string',
              example: 'https://example.com/thumb.jpg',
            },
            category: { type: 'string', example: 'Eletrônicos' },
            subcategory: { type: 'string', example: 'Smartphones' },
            originalPrice: { type: 'number', example: 800.0 },
            promotionalPrice: { type: 'number', example: 700.0 },
            discountPercentage: { type: 'number', example: 12.5 },
            averageRating: { type: 'number', example: 4.5 },
            totalReviews: { type: 'number', example: 150 },
            variations: {
              type: 'array',
              items: { type: 'object' },
            },
            realImage: {
              type: 'string',
              example: 'https://example.com/image.jpg',
            },
            isActive: { type: 'boolean', example: true },
            isFeatured: { type: 'boolean', example: false },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  url: { type: 'string' },
                  alt: { type: 'string' },
                  order: { type: 'number' },
                  isActive: { type: 'boolean' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Produto com código PROD-001 não encontrado',
            },
            statusCode: { type: 'number', example: 404 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getProductByCode(
    @Param('code') code: string,
    @RequestId() _requestId: string,
  ): Promise<BaseResponseDto<any>> {
    const result = await this.getProductByCodeUseCase.execute(code);
    return BaseResponseDto.success(result);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar produto',
    description:
      'Atualiza um produto existente. Todos os campos são opcionais - apenas os campos fornecidos serão atualizados.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único do produto',
    type: 'number',
    example: 123,
  })
  @ApiBody({
    description: 'Dados do produto para atualização',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Código único do produto',
          example: 'PROD-001',
        },
        name: {
          type: 'string',
          description: 'Nome do produto',
          example: 'Smartphone XYZ Pro',
        },
        description: {
          type: 'string',
          description: 'Descrição detalhada do produto',
          example: 'Smartphone com tela de 6.1 polegadas - Versão Pro',
        },
        ncm: {
          type: 'string',
          description: 'Código NCM do produto',
          example: '85171200',
        },
        stock: {
          type: 'number',
          description: 'Quantidade em estoque',
          minimum: 0,
          example: 50,
        },
        costPrice: {
          type: 'number',
          description: 'Preço de custo do produto',
          minimum: 0,
          example: 500.0,
        },
        supplier: {
          type: 'string',
          description: 'Nome do fornecedor',
          example: 'Fornecedor ABC',
        },
        gtinEan: {
          type: 'string',
          description: 'Código GTIN/EAN do produto',
          example: '1234567890123',
        },
        gtinEanPackage: {
          type: 'string',
          description: 'Código GTIN/EAN da embalagem',
          example: '1234567890123',
        },
        supplierProductDescription: {
          type: 'string',
          description: 'Descrição do produto fornecida pelo fornecedor',
          example: 'Descrição técnica detalhada',
        },
        thumbnail: {
          type: 'string',
          format: 'url',
          description: 'URL da imagem thumbnail',
          example: 'https://example.com/thumb.jpg',
        },
        realImage: {
          type: 'string',
          format: 'url',
          description: 'URL da imagem principal do produto',
          example: 'https://example.com/image.jpg',
        },
        category: {
          type: 'string',
          description: 'Categoria do produto',
          example: 'Eletrônicos',
        },
        subcategory: {
          type: 'string',
          description: 'Subcategoria do produto',
          example: 'Smartphones',
        },
        originalPrice: {
          type: 'number',
          description: 'Preço original do produto',
          minimum: 0,
          example: 800.0,
        },
        promotionalPrice: {
          type: 'number',
          description: 'Preço promocional (opcional)',
          minimum: 0,
          example: 700.0,
        },
        discountPercentage: {
          type: 'number',
          description: 'Percentual de desconto',
          minimum: 0,
          maximum: 100,
          example: 12.5,
        },
        averageRating: {
          type: 'number',
          description: 'Avaliação média do produto',
          minimum: 0,
          maximum: 5,
          example: 4.5,
        },
        totalReviews: {
          type: 'number',
          description: 'Total de avaliações recebidas',
          minimum: 0,
          example: 150,
        },
        variations: {
          type: 'array',
          description: 'Variações do produto (cores, tamanhos, etc.)',
          items: {
            type: 'object',
          },
          example: [
            { color: 'Preto', size: '128GB' },
            { color: 'Branco', size: '256GB' },
          ],
        },
        isActive: {
          type: 'boolean',
          description: 'Status ativo/inativo do produto',
          example: true,
        },
        isFeatured: {
          type: 'boolean',
          description: 'Produto em destaque',
          example: false,
        },
        images: {
          type: 'array',
          description: 'Array de URLs de imagens adicionais',
          items: {
            type: 'string',
            format: 'url',
          },
          example: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 123 },
            name: { type: 'string', example: 'Smartphone XYZ Pro' },
            code: { type: 'string', example: 'PROD-001' },
            description: { type: 'string' },
            originalPrice: { type: 'number', example: 800.0 },
            promotionalPrice: { type: 'number', example: 700.0 },
            stock: { type: 'number', example: 50 },
            isActive: { type: 'boolean', example: true },
            isFeatured: { type: 'boolean', example: false },
            category: { type: 'string', example: 'Eletrônicos' },
            subcategory: { type: 'string', example: 'Smartphones' },
            supplier: { type: 'string', example: 'Fornecedor ABC' },
            realImage: {
              type: 'string',
              example: 'https://example.com/image.jpg',
            },
            thumbnail: {
              type: 'string',
              example: 'https://example.com/thumb.jpg',
            },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  url: { type: 'string' },
                  alt: { type: 'string' },
                  order: { type: 'number' },
                  isActive: { type: 'boolean' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Dados inválidos' },
            details: { type: 'array', items: { type: 'string' } },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token JWT inválido ou ausente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
            statusCode: { type: 'number', example: 401 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Produto com ID 123 não encontrado',
            },
            statusCode: { type: 'number', example: 404 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @RequestId() _requestId: string,
  ): Promise<BaseResponseDto<any>> {
    const result = await this.updateProductUseCase.execute({
      id,
      data: updateProductDto,
    });
    return BaseResponseDto.success(result);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deletar produto (soft delete)',
    description:
      'Remove um produto do sistema usando soft delete. O produto não é removido fisicamente, apenas marcado como deletado. Requer autenticação JWT.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único do produto a ser deletado',
    type: 'number',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Produto deletado com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: { type: 'null', example: null },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token JWT inválido ou ausente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
            statusCode: { type: 'number', example: 401 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Produto com ID 123 não encontrado',
            },
            statusCode: { type: 'number', example: 404 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
    @RequestId() _requestId: string,
  ): Promise<BaseResponseDto<any>> {
    await this.deleteProductUseCase.execute(id);
    return BaseResponseDto.success(null);
  }

  @Post('catalog/update/:id')
  @ApiOperation({
    summary: 'Atualizar catálogo do produto',
    description:
      'Processa todos os produtos e atualiza o banco vetorial. Os chunks existentes são automaticamente limpos antes do processamento para evitar duplicações.',
  })
  @ApiParam({
    name: 'id',
    description:
      'ID único do produto (usado apenas para identificação da operação)',
    type: 'number',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Catálogo atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  async updateCatalog(
    @Param('id', ParseIntPipe) id: number,
    @RequestId() requestId: string,
  ): Promise<BaseResponseDto<any>> {
    console.log(
      `[${requestId}] Iniciando atualização de catálogo para produto ID: ${id}`,
    );

    // Buscar todos os produtos usando a query SQL específica
    const products = await this.getAllProductsForCatalogUseCase.execute();

    console.log(
      `[${requestId}] Query executada com sucesso. Total de produtos encontrados: ${products.length}`,
    );

    // Processar produtos e salvar no banco vetorial com embeddings
    // (Os chunks existentes serão automaticamente limpos antes do processamento)
    const vectorResult =
      await this.processAndSaveProductsToVectorDBUseCase.execute(products);

    console.log(
      `[${requestId}] Produtos processados e salvos no banco vetorial. Total salvos: ${vectorResult.saved}`,
    );

    if (vectorResult.errors.length > 0) {
      console.log(
        `[${requestId}] Erros encontrados:`,
        JSON.stringify(vectorResult.errors, null, 2),
      );
    }

    return BaseResponseDto.success({
      message:
        'Catálogo atualizado com sucesso. Chunks existentes foram limpos antes do processamento.',
      productId: id,
      totalProducts: products.length,
      vectorDBResult: {
        saved: vectorResult.saved,
        errors: vectorResult.errors.length,
        errorDetails: vectorResult.errors,
        chunksCleared: true,
      },
      timestamp: new Date().toISOString(),
    });
  }

  @Post('search/similar')
  @ApiOperation({
    summary: 'Buscar produtos similares usando embeddings',
    description:
      'Busca produtos similares usando inteligência artificial (OpenAI embeddings) e similaridade de cosseno. Não requer autenticação.',
  })
  @ApiBody({
    description: 'Query para busca por similaridade usando IA',
    schema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description:
            'Texto para busca por similaridade (ex: "smartphone Samsung", "notebook gamer", "fone bluetooth")',
          example: 'cartucho de toner HP preto',
          minLength: 3,
          maxLength: 500,
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (padrão: 10, máximo: 50)',
          example: 5,
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Produtos similares encontrados com sucesso',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            query: { type: 'string', example: 'cartucho de toner HP preto' },
            totalResults: { type: 'number', example: 5 },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'number',
                    example: 123,
                    description: 'ID único do produto',
                  },
                  productCode: {
                    type: 'string',
                    example: 'PROD-001',
                    description: 'Código único do produto',
                  },
                  productName: {
                    type: 'string',
                    example: 'Cartucho HP 305A Preto',
                    description: 'Nome do produto',
                  },
                  similarity: {
                    type: 'number',
                    example: 0.95,
                    description:
                      'Score de similaridade (0-1, onde 1 é idêntico)',
                  },
                  image: {
                    type: 'string',
                    format: 'url',
                    example: 'https://example.com/cartucho-hp-305a.jpg',
                    description: 'URL da imagem principal do produto',
                  },
                  metadata: {
                    type: 'object',
                    description:
                      'Metadados completos do produto (preços, estoque, categoria, etc.)',
                    properties: {
                      category: { type: 'string', example: 'Informática' },
                      subcategory: { type: 'string', example: 'Cartuchos' },
                      originalPrice: { type: 'number', example: 89.9 },
                      promotionalPrice: { type: 'number', example: 79.9 },
                      stock: { type: 'number', example: 15 },
                      isActive: { type: 'boolean', example: true },
                      isFeatured: { type: 'boolean', example: false },
                    },
                  },
                },
              },
            },
            processingTime: {
              type: 'number',
              example: 0.245,
              description: 'Tempo de processamento em segundos',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-09-26T00:30:00.000Z',
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Query inválida ou muito curta',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Query deve ter pelo menos 3 caracteres',
            },
            statusCode: { type: 'number', example: 400 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Erro ao processar busca por similaridade',
            },
            statusCode: { type: 'number', example: 500 },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async searchSimilarProducts(
    @Body() body: { query: string; limit?: number },
    @RequestId() requestId: string,
  ): Promise<BaseResponseDto<any>> {
    console.log(
      `[${requestId}] Buscando produtos similares para query: "${body.query}"`,
    );

    try {
      // Gerar embedding para a query
      const queryEmbedding = await this.openaiService.generateEmbedding(
        body.query,
      );

      // Buscar chunks similares
      const similarChunks = await this.chunkRepository.searchSimilar(
        queryEmbedding,
        body.limit || 10,
      );

      // Calcular similaridade para cada resultado
      const results = similarChunks.map(chunk => {
        const chunkEmbedding = chunk.getEmbeddingVector();
        const similarity = this.calculateCosineSimilarity(
          queryEmbedding,
          chunkEmbedding,
        );

        return {
          productId: chunk.productId,
          productCode: chunk.productCode,
          productName: chunk.productName,
          similarity: Math.round(similarity * 100) / 100, // Arredondar para 2 casas decimais
          image: chunk.metadata.realImage, // Mapear imagem do metadata
          metadata: chunk.metadata,
        };
      });

      console.log(
        `[${requestId}] Encontrados ${results.length} produtos similares`,
      );

      return BaseResponseDto.success({
        query: body.query,
        results: results,
        totalResults: results.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[${requestId}] Erro na busca por similaridade:`, error);
      throw error;
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vetores devem ter a mesma dimensão');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
