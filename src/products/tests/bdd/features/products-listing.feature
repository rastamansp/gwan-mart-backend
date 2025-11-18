Feature: Gerenciamento de Produtos
  Como um usuário do sistema
  Eu quero gerenciar produtos
  Para que eu possa criar, listar, atualizar e deletar produtos

  Background:
    Given que o sistema está funcionando
    And que existe um banco de dados PostgreSQL configurado
    And que as tabelas de produtos estão criadas

  Scenario: Listar todos os produtos
    Given que existem produtos cadastrados no sistema
    When eu faço uma requisição GET para "/api/v1/products"
    Then a resposta deve ter status 200
    And a resposta deve conter uma lista de produtos
    And cada produto deve ter os campos obrigatórios

  Scenario: Listar produtos com paginação
    Given que existem produtos cadastrados no sistema
    When eu faço uma requisição GET para "/api/v1/products" com parâmetros "page=1&limit=5"
    Then a resposta deve ter status 200
    And a resposta deve conter no máximo 5 produtos
    And a resposta deve conter informações de paginação

  Scenario: Buscar produto por ID
    Given que existe um produto com ID "1" cadastrado
    When eu faço uma requisição GET para "/api/v1/products/1"
    Then a resposta deve ter status 200
    And a resposta deve conter os dados do produto
    And o produto deve ter o ID "1"

  Scenario: Buscar produto inexistente
    Given que não existe um produto com ID "999999"
    When eu faço uma requisição GET para "/api/v1/products/999999"
    Then a resposta deve ter status 404
    And a resposta deve conter mensagem de erro

  Scenario: Listar primeiros produtos (mais recentes)
    Given que existem produtos cadastrados no sistema
    When eu faço uma requisição GET para "/api/v1/products/featured"
    Then a resposta deve ter status 200
    And a resposta deve conter uma lista de produtos
    And deve retornar no máximo 10 produtos
    And os produtos devem estar ordenados por data de criação decrescente

  Scenario: Filtrar produtos por categoria
    Given que existem produtos da categoria "Eletrodomésticos"
    When eu faço uma requisição GET para "/api/v1/products" com parâmetro "category=Eletrodomésticos"
    Then a resposta deve ter status 200
    And todos os produtos retornados devem ter categoria "Eletrodomésticos"

  Scenario: Filtrar produtos por faixa de preço
    Given que existem produtos com preços entre 100 e 500 reais
    When eu faço uma requisição GET para "/api/v1/products" com parâmetros "minPrice=100&maxPrice=500"
    Then a resposta deve ter status 200
    And todos os produtos retornados devem ter preço entre 100 e 500 reais

  Scenario: Buscar produtos por texto
    Given que existem produtos com "batedeira" no nome ou descrição
    When eu faço uma requisição GET para "/api/v1/products" com parâmetro "search=batedeira"
    Then a resposta deve ter status 200
    And todos os produtos retornados devem conter "batedeira" no nome ou descrição

  Scenario: Ordenar produtos por preço
    Given que existem produtos com diferentes preços
    When eu faço uma requisição GET para "/api/v1/products" com parâmetros "sortBy=originalPrice&sortOrder=ASC"
    Then a resposta deve ter status 200
    And os produtos devem estar ordenados por preço crescente

  Scenario: Buscar produto por código (URL amigável)
    Given que existe um produto com código "PROD001" cadastrado no sistema
    When eu faço uma requisição GET para "/api/v1/products/code/PROD001"
    Then a resposta deve ter status 200
    And a resposta deve conter um único produto
    And o produto deve ter o código "PROD001"
    And o produto deve estar ativo

  Scenario: Buscar produto por código inexistente
    Given que não existe produto com código "INEXISTENTE" no sistema
    When eu faço uma requisição GET para "/api/v1/products/code/INEXISTENTE"
    Then a resposta deve ter status 404
    And a resposta deve conter mensagem de erro "Produto não encontrado"
