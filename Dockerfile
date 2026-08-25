# ========================================
# BUILD STAGE
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências do sistema para build
RUN apk add --no-cache python3 make g++

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências (incluindo dev para build)
RUN npm ci && npm cache clean --force && \
    echo "Dependências instaladas. Verificando NestJS CLI..." && \
    npx nest --version

# Copiar código-fonte (ignorar apenas o que está no .dockerignore)
COPY . .

# Verificar estrutura de diretórios importantes
RUN test -d src/whatsapp-webhook && \
    test -d src/whatsapp-webhook/services && \
    test -f src/whatsapp-webhook/services/evolution-api.service.ts || \
    (echo "ERRO: Estrutura de diretorios do whatsapp-webhook nao encontrada!" && exit 1)

# Verificar se o SDK está instalado
RUN echo "=== Verificando pacote @solufy/evolution-sdk ===" && \
    npm list @solufy/evolution-sdk || echo "AVISO: SDK nao encontrado nas dependencias instaladas"

# Compilar TypeScript para JavaScript
RUN echo "=== Iniciando build ===" && \
    npm run build 2>&1 && \
    echo "=== Build concluido ===" && \
    echo "=== Verificando estrutura dist/ ===" && \
    find dist -type f -name "*.js" 2>&1 | head -20 && \
    echo "=== Procurando main.js ===" && \
    find dist -name "main.js" -type f 2>&1 && \
    echo "=== Procurando app.module.js ===" && \
    find dist -name "app.module.js" -type f 2>&1

# ========================================
# PRODUCTION STAGE
# ========================================
FROM node:20-alpine AS production

WORKDIR /app

# Instalar dependências do sistema (wget e netcat para health check)
RUN apk add --no-cache wget netcat-openbsd

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de produção + devDependencies necessárias para MCP
RUN npm ci --only=production && \
    npm install --save-dev ts-node typescript @types/node && \
    npm cache clean --force

# Copiar código buildado do stage builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Log informativo da estrutura copiada
RUN echo "=== Estrutura dist/ copiada ===" && \
    ls -la dist/ 2>&1 | head -10 && \
    (test -d dist/src && echo "=== Estrutura dist/src/ ===" && ls -la dist/src/ 2>&1 | head -10 || echo "AVISO: dist/src/ nao existe") || true

# Copiar toda a estrutura src/ para MCP poder executar (bootstrap precisa de toda a estrutura)
COPY --from=builder --chown=nestjs:nodejs /app/src ./src
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nestjs:nodejs /app/nest-cli.json ./nest-cli.json

# Entrypoint (a stage de produção não copia o repositório inteiro)
COPY --from=builder --chown=nestjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Mudar para usuário não-root
USER nestjs

# Expor porta (slot 11 do ecossistema GWAN)
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3011/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Inicialização: o entrypoint espera o PostgreSQL, aplica as migrations e só
# então sobe a aplicação. Antes este CMD chamava o node direto e o
# docker-entrypoint.sh era código morto — nenhuma migration rodava no deploy.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
