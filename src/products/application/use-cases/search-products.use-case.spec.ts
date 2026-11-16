import { Logger } from '@nestjs/common';
import { SearchProductsUseCase } from './search-products.use-case';
import { IEmbeddingService } from '@/shared/application/interfaces/embedding-service.interface';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { IProductChunkRepository } from '../../infrastructure/repositories/typeorm-product-chunk.repository';
import { Product } from '../../domain/entities/product.entity';
import { ProductChunk } from '../../domain/entities/product-chunk.entity';

/**
 * Regressão da issue #12: sem OPENAI_API_KEY a busca do catálogo respondia
 * 500. A chave é opcional (o chat pode ser Claude); sem ela, ou com o provedor
 * falhando, a busca cai para textual.
 */
describe('SearchProductsUseCase', () => {
  const cafe = {
    id: 7,
    code: 'CAF-001',
    name: 'Café Especial',
    category: 'Mercearia',
    subcategory: 'Cafés',
    realImage: 'https://img/cafe.jpg',
    originalPrice: 39.9,
    promotionalPrice: null,
    discountPercentage: 0,
    stock: 12,
    averageRating: 4.5,
    totalReviews: 10,
    isActive: true,
    isFeatured: false,
    costPrice: 20,
    supplier: 'Torrefação X',
  } as unknown as Product;

  function setup(embedding: Partial<IEmbeddingService>) {
    const productRepository = {
      searchByText: jest.fn().mockResolvedValue([cafe]),
    } as unknown as jest.Mocked<IProductRepository>;
    const chunkRepository = {
      searchSimilar: jest.fn(),
    } as unknown as jest.Mocked<IProductChunkRepository>;
    const useCase = new SearchProductsUseCase(
      embedding as IEmbeddingService,
      chunkRepository,
      productRepository,
    );
    return { useCase, productRepository, chunkRepository };
  }

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it('sem provedor configurado, busca por texto sem chamar o provedor', async () => {
    const generateEmbedding = jest.fn();
    const { useCase, productRepository, chunkRepository } = setup({
      isConfigured: () => false,
      generateEmbedding,
    });

    const result = await useCase.execute('cafe', 10);

    expect(result.mode).toBe('text');
    expect(result.fallbackReason).toBe('embedding-not-configured');
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(chunkRepository.searchSimilar).not.toHaveBeenCalled();
    expect(productRepository.searchByText).toHaveBeenCalledWith('cafe', 10);
    expect(result.results).toEqual([
      expect.objectContaining({
        productId: 7,
        productCode: 'CAF-001',
        productName: 'Café Especial',
        similarity: null,
        image: 'https://img/cafe.jpg',
      }),
    ]);
  });

  it('no modo textual não expõe preço de custo nem fornecedor', async () => {
    const { useCase } = setup({ isConfigured: () => false });

    const [hit] = (await useCase.execute('cafe', 10)).results;

    expect(hit.metadata).not.toHaveProperty('costPrice');
    expect(hit.metadata).not.toHaveProperty('supplier');
    expect(hit.metadata).toMatchObject({ category: 'Mercearia', stock: 12 });
  });

  it('com o provedor falhando em runtime, cai para texto em vez de lançar', async () => {
    const { useCase, productRepository } = setup({
      isConfigured: () => true,
      generateEmbedding: jest
        .fn()
        .mockRejectedValue(new Error('Falha ao gerar embedding: Incorrect API key')),
    });

    const result = await useCase.execute('cafe', 5);

    expect(result.mode).toBe('text');
    expect(result.fallbackReason).toBe('semantic-search-failed');
    expect(productRepository.searchByText).toHaveBeenCalledWith('cafe', 5);
    expect(result.results).toHaveLength(1);
  });

  it('com o provedor respondendo, a busca é semântica e traz similaridade', async () => {
    const chunk = {
      productId: 7,
      productCode: 'CAF-001',
      productName: 'Café Especial',
      metadata: { realImage: 'https://img/cafe.jpg', category: 'Mercearia' },
      getEmbeddingVector: () => [1, 0],
    } as unknown as ProductChunk;
    const { useCase, productRepository, chunkRepository } = setup({
      isConfigured: () => true,
      generateEmbedding: jest.fn().mockResolvedValue([1, 0]),
    });
    chunkRepository.searchSimilar.mockResolvedValue([chunk]);

    const result = await useCase.execute('café especial', 3);

    expect(result.mode).toBe('semantic');
    expect(result.fallbackReason).toBeUndefined();
    expect(productRepository.searchByText).not.toHaveBeenCalled();
    expect(chunkRepository.searchSimilar).toHaveBeenCalledWith([1, 0], 3);
    expect(result.results[0]).toMatchObject({ productCode: 'CAF-001', similarity: 1 });
  });

  it('erro também na busca textual (banco fora) continua subindo', async () => {
    const { useCase, productRepository } = setup({ isConfigured: () => false });
    productRepository.searchByText.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(useCase.execute('cafe', 10)).rejects.toThrow('ECONNREFUSED');
  });
});
