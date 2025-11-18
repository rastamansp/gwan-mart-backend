import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for featured product response
 */
export class FeaturedProductDto {
  @ApiProperty({
    description: 'Unique product ID',
    example: 16527361911,
  })
  id: number;

  @ApiProperty({
    description: 'Product code',
    example: 'BRITANIA-PEROLA-550T-220V',
  })
  code: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Smartphone Premium 5G',
  })
  name: string;

  @ApiProperty({
    description: 'Product category',
    example: 'Eletrônicos',
  })
  category: string;

  @ApiProperty({
    description: 'Product subcategory',
    example: 'Smartphones',
  })
  subcategory: string;

  @ApiProperty({
    description: 'Discount percentage',
    example: 19,
  })
  discountPercentage: number;

  @ApiProperty({
    description: 'Current promotional price',
    example: 1299.99,
  })
  currentPrice: number;

  @ApiProperty({
    description: 'Original price',
    example: 1599.99,
  })
  originalPrice: number;

  @ApiProperty({
    description: 'Formatted current price',
    example: 'R$ 1.299,99',
  })
  formattedCurrentPrice: string;

  @ApiProperty({
    description: 'Formatted original price',
    example: 'R$ 1.599,99',
  })
  formattedOriginalPrice: string;

  @ApiProperty({
    description: 'Product thumbnail image URL',
    example: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  })
  thumbnail: string;

  @ApiProperty({
    description: 'Average rating score',
    example: 4.2,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Total number of reviews',
    example: 127,
  })
  totalReviews: number;

  @ApiProperty({
    description: 'Formatted rating',
    example: '4.2',
  })
  formattedRating: string;

  @ApiProperty({
    description: 'Formatted reviews count',
    example: '(127 avaliações)',
  })
  formattedReviews: string;

  @ApiProperty({
    description: 'Stock quantity',
    example: 43,
  })
  stock: number;

  @ApiProperty({
    description: 'Indicates if product is available in stock',
    example: true,
  })
  isAvailable: boolean;

  constructor(product: any) {
    this.id = product.id;
    this.code = product.code;
    this.name = product.name;
    this.category = product.category;
    this.subcategory = product.subcategory;
    this.discountPercentage = product.discountPercentage;
    this.currentPrice = product.promotionalPrice || product.originalPrice;
    this.originalPrice = product.originalPrice;
    this.formattedCurrentPrice = this.formatPrice(this.currentPrice);
    this.formattedOriginalPrice = this.formatPrice(this.originalPrice);
    this.thumbnail = product.thumbnail;
    this.averageRating = product.averageRating;
    this.totalReviews = product.totalReviews;
    this.formattedRating = product.averageRating.toFixed(1);
    this.formattedReviews = `(${product.totalReviews} avaliações)`;
    this.stock = product.stock;
    this.isAvailable = product.stock > 0;
  }

  private formatPrice(price: number): string {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  }
}

/**
 * DTO for featured products response
 */
export class FeaturedProductsResponseDto {
  @ApiProperty({
    description: 'Array of featured products',
    type: [FeaturedProductDto],
  })
  products: FeaturedProductDto[];

  @ApiProperty({
    description: 'Total number of featured products',
    example: 4,
  })
  total: number;

  @ApiProperty({
    description: 'Categories represented in featured products',
    example: ['Eletrônicos', 'Áudio', 'Computadores', 'Wearables'],
    type: [String],
  })
  categories: string[];

  constructor(products: any[]) {
    this.products = products.map(product => new FeaturedProductDto(product));
    this.total = this.products.length;
    this.categories = [...new Set(this.products.map(p => p.category))];
  }
}
