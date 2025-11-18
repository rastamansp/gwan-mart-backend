# language: pt

Funcionalidade: Sessão e Contexto do Chat (POST /api/chat)
  Como um usuario do sistema
  Eu quero manter contexto entre mensagens
  Para que o chatbot possa entender melhor minhas necessidades

  Contexto:
    Dado que o chatbot esta disponivel

  @chat @session
  Cenário: Criar sessao ao enviar primeira mensagem
    Quando envio a mensagem "Olá, como posso ajudar?"
    Então devo receber uma resposta
    E o status da resposta deve ser 200
    # Nota: sessionId é opcional e só é retornado quando phoneNumber é fornecido

  @chat @session
  Cenário: Manter contexto entre mensagens na mesma sessao
    Quando envio a mensagem "Olá"
    Então devo receber uma resposta
    # Nota: sessionId será criado automaticamente pelo step "com a mesma sessao" se necessário
    Quando envio a mensagem "Como posso ver os produtos?" com a mesma sessao
    Então devo receber uma resposta
    E o status da resposta deve ser 200

  @chat @session @context
  Cenário: Usar contexto do usuario na busca
    Quando envio a mensagem "Quero ver produtos" com contexto do usuario:
      """
      {
        "preferences": {
          "category": "eletronicos"
        }
      }
      """
    Então devo receber uma resposta
    E o status da resposta deve ser 200
