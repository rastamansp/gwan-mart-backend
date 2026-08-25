# Loja do Gwan Mart (mart.gwan.cloud) — build estático servido por nginx.
#
# Contexto de build é este diretório (web/), não a raiz do repo: a loja não
# precisa do código da API para ser construída.

# ---------- build ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY . .

# As VITE_* são "baked" no bundle: precisam existir no build, não no runtime.
ARG VITE_MART_API_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ENV VITE_MART_API_URL=$VITE_MART_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build && test -f dist/index.html

# ---------- produção ----------
FROM nginx:alpine AS production

RUN apk add --no-cache wget

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
