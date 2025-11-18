import { DataSource } from 'typeorm';
import { Product } from '../products/domain/entities/product.entity';
import { ProductImage } from '../products/domain/entities/product-image.entity';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const sampleProducts = [
  {
    code: 'PROD-001',
    name: 'Smartphone Galaxy Pro Max',
    description: 'Smartphone premium com tela AMOLED de 6.7", processador octa-core, 256GB de armazenamento, câmera tripla de 108MP e bateria de 5000mAh. Ideal para quem busca performance e qualidade de imagem.',
    ncm: '8517.12.00',
    stock: 50,
    costPrice: 2500.00,
    supplier: 'Tech Distribuidora LTDA',
    gtinEan: '7891234567890',
    gtinEanPackage: '7891234567891',
    supplierProductDescription: 'Smartphone Galaxy Pro Max 256GB Preto',
    thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    realImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop',
    category: 'Eletrônicos',
    subcategory: 'Smartphones',
    originalPrice: 3999.99,
    promotionalPrice: 3499.99,
    discountPercentage: 12.5,
    averageRating: 4.7,
    totalReviews: 234,
    isActive: true,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1601972602237-8c79241e468b?w=800&h=800&fit=crop',
    ],
  },
  {
    code: 'PROD-002',
    name: 'Notebook Gamer Ultra',
    description: 'Notebook gamer de alta performance com processador Intel i7 de 11ª geração, 16GB RAM, SSD 512GB, placa de vídeo RTX 3060 e tela Full HD de 15.6" 144Hz. Perfeito para jogos e trabalho pesado.',
    ncm: '8471.30.12',
    stock: 30,
    costPrice: 4500.00,
    supplier: 'Tech Distribuidora LTDA',
    gtinEan: '7891234567892',
    gtinEanPackage: '7891234567893',
    supplierProductDescription: 'Notebook Gamer Ultra i7 RTX 3060 16GB',
    thumbnail: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
    realImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=800&fit=crop',
    category: 'Eletrônicos',
    subcategory: 'Notebooks',
    originalPrice: 6999.99,
    promotionalPrice: 6299.99,
    discountPercentage: 10.0,
    averageRating: 4.8,
    totalReviews: 156,
    isActive: true,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop',
    ],
  },
  {
    code: 'PROD-003',
    name: 'Fone de Ouvido Bluetooth Premium',
    description: 'Fone de ouvido sem fio com cancelamento de ruído ativo, bateria de 30 horas, som Hi-Fi, microfone integrado e design ergonômico. Compatível com todos os dispositivos Bluetooth.',
    ncm: '8518.30.00',
    stock: 100,
    costPrice: 180.00,
    supplier: 'Audio Tech Importadora',
    gtinEan: '7891234567894',
    gtinEanPackage: '7891234567895',
    supplierProductDescription: 'Fone Bluetooth Premium ANC 30h Preto',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    realImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
    category: 'Eletrônicos',
    subcategory: 'Áudio',
    originalPrice: 499.99,
    promotionalPrice: 399.99,
    discountPercentage: 20.0,
    averageRating: 4.6,
    totalReviews: 412,
    isActive: true,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=800&fit=crop',
    ],
  },
  {
    code: 'PROD-004',
    name: 'Smartwatch Fitness Pro',
    description: 'Relógio inteligente com monitoramento de saúde 24/7, GPS integrado, resistente à água, tela AMOLED de 1.4", bateria de 7 dias e mais de 100 modos de exercício. Ideal para atletas e entusiastas do fitness.',
    ncm: '9102.12.00',
    stock: 75,
    costPrice: 350.00,
    supplier: 'Wearable Solutions',
    gtinEan: '7891234567896',
    gtinEanPackage: '7891234567897',
    supplierProductDescription: 'Smartwatch Fitness Pro GPS Preto',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    realImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
    category: 'Eletrônicos',
    subcategory: 'Wearables',
    originalPrice: 899.99,
    promotionalPrice: 749.99,
    discountPercentage: 16.7,
    averageRating: 4.5,
    totalReviews: 289,
    isActive: true,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=800&h=800&fit=crop',
    ],
  },
  {
    code: 'PROD-005',
    name: 'Tablet Ultra HD 10.5"',
    description: 'Tablet com tela Ultra HD de 10.5", processador octa-core, 128GB de armazenamento, câmera dupla de 13MP, bateria de 8000mAh e suporte para caneta digital. Perfeito para trabalho, estudos e entretenimento.',
    ncm: '8471.30.12',
    stock: 40,
    costPrice: 1200.00,
    supplier: 'Tech Distribuidora LTDA',
    gtinEan: '7891234567898',
    gtinEanPackage: '7891234567899',
    supplierProductDescription: 'Tablet Ultra HD 10.5" 128GB Cinza',
    thumbnail: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
    realImage: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop',
    category: 'Eletrônicos',
    subcategory: 'Tablets',
    originalPrice: 1999.99,
    promotionalPrice: 1799.99,
    discountPercentage: 10.0,
    averageRating: 4.4,
    totalReviews: 178,
    isActive: true,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1527694712203-5b17e23400a2?w=800&h=800&fit=crop',
    ],
  },
];

async function seedProducts() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Product, ProductImage],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conexão com banco de dados estabelecida');

    const productRepository = dataSource.getRepository(Product);
    const imageRepository = dataSource.getRepository(ProductImage);

    // Verificar se já existem produtos
    const existingProducts = await productRepository.count();
    if (existingProducts > 0) {
      console.log(`⚠️  Já existem ${existingProducts} produtos no banco. Pulando seed.`);
      console.log('💡 Para recriar os produtos, delete-os primeiro ou use um banco limpo.');
      await dataSource.destroy();
      return;
    }

    console.log('🌱 Iniciando seed de produtos...');

    for (const productData of sampleProducts) {
      const { images, ...productFields } = productData;

      // Criar produto
      const product = productRepository.create({
        ...productFields,
        variations: null,
      });

      const savedProduct = await productRepository.save(product);
      console.log(`✅ Produto criado: ${savedProduct.name} (ID: ${savedProduct.id})`);

      // Criar imagens do produto
      if (images && images.length > 0) {
        const productImages = images.map((url, index) =>
          imageRepository.create({
            url,
            alt: `${savedProduct.name} - Imagem ${index + 1}`,
            order: index,
            isActive: true,
            productId: savedProduct.id,
          }),
        );

        await imageRepository.save(productImages);
        console.log(`   📸 ${productImages.length} imagem(ns) adicionada(s)`);
      }
    }

    console.log(`\n🎉 Seed concluído! ${sampleProducts.length} produtos criados com sucesso.`);
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Conexão com banco de dados encerrada');
  }
}

// Executar seed se o script for chamado diretamente
if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log('✅ Processo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export default seedProducts;

