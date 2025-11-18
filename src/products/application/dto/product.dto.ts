import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  code: string;

  @IsString()
  description: string;

  @IsString()
  ncm: string;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsString()
  supplier: string;

  @IsString()
  gtinEan: string;

  @IsString()
  gtinEanPackage: string;

  @IsString()
  supplierProductDescription: string;

  @IsUrl()
  thumbnail: string;

  @IsString()
  category: string;

  @IsString()
  subcategory: string;

  @IsNumber()
  @Min(0)
  originalPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  promotionalPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalReviews?: number;

  @IsOptional()
  @IsArray()
  variations?: any[];

  @IsUrl()
  realImage: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  images?: string[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  gtinEan?: string;

  @IsOptional()
  @IsString()
  gtinEanPackage?: string;

  @IsOptional()
  @IsString()
  supplierProductDescription?: string;

  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  promotionalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalReviews?: number;

  @IsOptional()
  @IsArray()
  variations?: any[];

  @IsOptional()
  @IsUrl()
  realImage?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  images?: string[];
}

export class ProductFiltersDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return 1;
    if (typeof value === 'number') return value;
    const num = parseInt(String(value), 10);
    return isNaN(num) ? 1 : num;
  })
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return 10;
    if (typeof value === 'number') return value;
    const num = parseInt(String(value), 10);
    return isNaN(num) ? 10 : num;
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
