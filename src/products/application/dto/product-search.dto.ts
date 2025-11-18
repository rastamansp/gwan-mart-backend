import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for product search filters
 */
export class ProductSearchFiltersDto {
  @ApiProperty({
    description: 'Search term for product name or description',
    example: 'smartphone',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Product category filter',
    example: 'Eletrônicos',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Product subcategory filter',
    example: 'Smartphones',
    required: false,
  })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiProperty({
    description: 'Minimum price filter',
    example: 100,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price filter',
    example: 1000,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({
    description: 'Minimum discount percentage filter',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  minDiscount?: number;

  @ApiProperty({
    description: 'Minimum rating filter',
    example: 4.0,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiProperty({
    description: 'Filter only products in stock',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  inStock?: boolean;

  @ApiProperty({
    description: 'Filter only products on sale',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  onSale?: boolean;

  @ApiProperty({
    description: 'Sort by field',
    example: 'price',
    enum: ['name', 'price', 'discount', 'rating', 'reviews'],
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'price' | 'discount' | 'rating' | 'reviews';

  @ApiProperty({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * DTO for product search response
 */
export class ProductSearchResponseDto {
  @ApiProperty({
    description: 'Array of products matching the search criteria',
    type: [Object],
  })
  products: any[];

  @ApiProperty({
    description: 'Total number of products found',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Applied filters summary',
    example: {
      search: 'smartphone',
      category: 'Eletrônicos',
      minPrice: 100,
      maxPrice: 1000,
    },
  })
  filters: any;

  @ApiProperty({
    description: 'Available categories in results',
    example: ['Eletrônicos', 'Áudio', 'Computadores'],
    type: [String],
  })
  availableCategories: string[];

  @ApiProperty({
    description: 'Price range in results',
    example: { min: 50, max: 2000 },
  })
  priceRange: { min: number; max: number };

  constructor(
    products: any[],
    total: number,
    page: number,
    limit: number,
    filters: any,
  ) {
    this.products = products;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.filters = filters;
    this.availableCategories = [...new Set(products.map(p => p.category))];
    this.priceRange = this.calculatePriceRange(products);
  }

  private calculatePriceRange(products: any[]): { min: number; max: number } {
    if (products.length === 0) {
      return { min: 0, max: 0 };
    }

    const prices = products.map(p => p.promotionalPrice || p.originalPrice);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }
}
