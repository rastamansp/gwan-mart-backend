# Módulo de Webhook WhatsApp (Evolution API)

Este módulo recebe e processa webhooks da Evolution API, registrando todas as mensagens e eventos do WhatsApp de forma estruturada.

## Estrutura

```
whatsapp-webhook/
├── whatsapp-webhook.module.ts    # Módulo NestJS
├── whatsapp-webhook.controller.ts # Controller REST para receber webhooks
├── whatsapp-webhook.service.ts   # Service para processar e logar eventos
├── services/
│   └── evolution-api.service.ts  # Service para enviar mensagens via Evolution API
├── dtos/
│   └── evolution-webhook.dto.ts  # DTOs para tipos de eventos
├── whatsapp-webhook.http         # Arquivos de teste HTTP
└── README.md                     # Esta documentação
```

## Endpoint

### POST `/api/webhooks/whatsapp`

Recebe webhooks da Evolution API e registra os eventos.

**Exemplo de Request:**

```json
{
  "event": "messages.upsert",
  "instance": "minha-instancia",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0123456789ABCDEF"
    },
    "message": {
      "conversation": "Olá, esta é uma mensagem de teste"
    },
    "messageTimestamp": 1701234567,
    "pushName": "João Silva"
  }
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Webhook processado com sucesso"
}
```

## Eventos Suportados

O módulo processa e registra os seguintes tipos de eventos:

### Mensagens
- **`messages.upsert`**: Mensagem recebida ou enviada
- **`messages.update`**: Atualização de status de mensagem (lida, entregue, etc)
- **`messages.delete`**: Mensagem deletada

### Conexão
- **`connection.update`**: Mudança no status de conexão (conectado, desconectado, etc)

### QR Code
- **`qrcode.update`**: Atualização de QR Code (gerado, escaneado, etc)

### Contatos
- **`contacts.update`**: Contato atualizado
- **`contacts.upsert`**: Contato criado/atualizado

### Grupos
- **`groups.upsert`**: Grupo criado/atualizado
- **`groups.update`**: Grupo atualizado

### Presença
- **`presence.update`**: Mudança de presença (online, offline, digitando, etc)

## Logging

Todos os eventos são logados de forma estruturada usando o logger do NestJS:

### Mensagens
- **Tipo de mensagem**: texto, imagem, vídeo, áudio, documento, etc
- **Remetente**: número do WhatsApp, nome (pushName)
- **Conteúdo**: texto da mensagem ou tipo de mídia
- **Timestamp**: data/hora da mensagem
- **Direção**: se foi enviada (`fromMe: true`) ou recebida (`fromMe: false`)

### Exemplo de Log

```
[App] 💬 Mensagem recebida/enviada via WhatsApp {"instance":"minha-instancia","messageId":"3EB0123456789ABCDEF","from":"5511999999999@s.whatsapp.net","pushName":"João Silva","isFromMe":false,"messageType":"text","text":"Olá, esta é uma mensagem de teste","timestamp":"2025-11-03T02:15:00.000Z"}
```

## Configuração na Evolution API

Para configurar o webhook na Evolution API, use o seguinte endpoint ao criar/atualizar uma instância:

```bash
POST /instance/create
{
  "instanceName": "minha-instancia",
  "token": "seu-token",
  "qrcode": true,
  "number": "5511999999999",
  "integration": "WHATSAPP-BAILEYS",
  "webhook": {
    "url": "http://seu-servidor.com/api/webhooks/whatsapp",
    "byEvents": true,
    "base64": false,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "MESSAGES_DELETE",
      "CONNECTION_UPDATE",
      "QRCODE_UPDATE",
      "CONTACTS_UPDATE",
      "CONTACTS_UPSERT",
      "GROUPS_UPSERT",
      "GROUPS_UPDATE",
      "PRESENCE_UPDATE"
    ]
  }
}
```

## Testes

Use o arquivo `whatsapp-webhook.http` para testar diferentes tipos de eventos:

```bash
# Executar requisições via REST Client (VS Code)
# Ou usar curl:
curl -X POST http://localhost:3001/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "minha-instancia",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "3EB0123456789ABCDEF"
      },
      "message": {
        "conversation": "Mensagem de teste"
      },
      "messageTimestamp": 1701234567,
      "pushName": "João Silva"
    }
  }'
```

## Segurança

⚠️ **Importante**: Este endpoint está aberto e não possui autenticação. Recomenda-se:

1. **Validar origem**: Implementar validação de IP ou token na Evolution API
2. **HTTPS**: Usar HTTPS em produção
3. **Rate Limiting**: Implementar rate limiting para evitar spam
4. **Autenticação**: Adicionar autenticação via header ou query parameter

Exemplo de validação adicional que pode ser implementada:

```typescript
// Adicionar validação de token ou IP
if (headers['x-evolution-api-token'] !== process.env.EVOLUTION_API_TOKEN) {
  throw new UnauthorizedException('Token inválido');
}
```

## Documentação Swagger

Acesse `http://localhost:3001/api` para ver a documentação completa no Swagger, incluindo exemplos de payloads para cada tipo de evento.

## Integração com Chat (Chatbot Automático)

O módulo está integrado com o serviço de chat para responder automaticamente mensagens recebidas via WhatsApp.

### Fluxo de Processamento

Quando uma mensagem é recebida (`fromMe: false`):

1. **Recebimento**: Webhook recebe a mensagem da Evolution API
2. **Extração**: Sistema extrai o texto da mensagem
3. **Detecção de agente**: Resolve qual agente deve responder (padrão: Corretor de Imóveis)
4. **Chat**: Chama internamente o serviço de chat (`/api/chat`)
5. **Resposta**: Envia a resposta do agente via Evolution API para o remetente

### Troca de Agente via Comando

**Nota**: A funcionalidade de troca de agente será atualizada para o contexto de imóveis em uma versão futura.
3. Envia uma mensagem de confirmação informando qual agente está ativo.

### Configuração

Adicione as seguintes variáveis no arquivo `.env`:

```env
EVOLUTION_INSTANCE_URL=http://localhost:8080
EVOLUTION_INSTANCE=09BA00F4FE55-4C37-859A-5743BE3BD4E7
# ou
EVOLUTION_API_KEY=<chave-da-evolution>
```

**Nota**: 
- A URL deve ser apenas a base, sem o caminho do endpoint
- O serviço utiliza o SDK oficial `@solufy/evolution-sdk` ao invés de chamadas HTTP diretas
- O SDK gerencia automaticamente a construção das URLs e autenticação

### Comportamento

- **Mensagens Recebidas**: Apenas mensagens com `fromMe: false` são processadas
- **Tipos de Mensagem**: Atualmente processa apenas mensagens de texto (`conversation` ou `extendedTextMessage`)
- **Erros**: Erros são logados mas não quebram o processamento do webhook
- **Logging**: Cada etapa é logada estruturadamente para rastreabilidade

### Exemplo de Fluxo

```
1. Usuário envia: "Liste eventos em São Paulo"
   ↓
2. Webhook recebe mensagem (fromMe: false)
   ↓
3. Sistema extrai texto: "Liste eventos em São Paulo"
   ↓
4. Chama ChatService.chat("Liste eventos em São Paulo")
   ↓
5. Chat retorna resposta estruturada
   ↓
6. Sistema envia resposta via Evolution API para o usuário
```

### Logs

O sistema registra logs detalhados em cada etapa:

```json
{
  "level": "info",
  "message": "🤖 Iniciando processamento de mensagem recebida",
  "instanceName": "Gwan",
  "remoteJid": "5511987221050@s.whatsapp.net",
  "messageText": "Liste eventos em São Paulo"
}

{
  "level": "info",
  "message": "✅ Resposta do chat obtida",
  "answerLength": 250,
  "toolsUsed": 1
}

{
  "level": "info",
  "message": "✅ Mensagem processada e resposta enviada com sucesso",
  "duration": 1250
}
```

## Próximos Passos

Possíveis melhorias futuras:

- [x] Integrar com o chatbot para responder automaticamente
- [ ] Armazenar mensagens no banco de dados
- [ ] Implementar processamento assíncrono (fila)
- [ ] Adicionar autenticação via token
- [ ] Criar dashboard de mensagens recebidas
- [ ] Implementar webhook signature validation
- [ ] Suporte a outros tipos de mídia (imagens, áudio, etc)
- [ ] Contexto de conversa (manter histórico da conversa)

