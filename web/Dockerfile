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
# Origem pública da loja: vai nas meta de prévia do index.html (og:image precisa
# de URL absoluta) e, no estágio de produção, no robots.txt.
ARG VITE_SITE_URL=https://mart.gwan.cloud
# Número do pedido por WhatsApp (DDI+DDD+número). Sem default de propósito: o
# contato não fica escrito no repositório. Ver a checagem logo abaixo.
ARG VITE_WHATSAPP_NUMBER
ENV VITE_MART_API_URL=$VITE_MART_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_WHATSAPP_NUMBER=$VITE_WHATSAPP_NUMBER

# Pedido por WhatsApp é o ÚNICO caminho de compra da loja. Sem o número, o
# pedido fica "indisponível" e a loja vira vitrine sem venda — em silêncio, porque
# o build passa e a página abre normal. Por isso o build FALHA sem número
# válido, em vez de só avisar num log de build que ninguém lê.
# Loja sem pedido de propósito (vitrine, teste): VITE_WHATSAPP_NUMBER=none.
RUN set -e; \
  if [ "$VITE_WHATSAPP_NUMBER" = "none" ]; then \
    echo "AVISO: VITE_WHATSAPP_NUMBER=none — loja SEM pedido por WhatsApp (escolha explícita)."; \
  else \
    digits=$(printf '%s' "$VITE_WHATSAPP_NUMBER" | tr -cd '0-9'); \
    if [ ${#digits} -lt 10 ]; then \
      echo "ERRO: VITE_WHATSAPP_NUMBER vazio ou inválido ('$VITE_WHATSAPP_NUMBER')." >&2; \
      echo "  Sem ele a loja não oferece o pedido por WhatsApp, único caminho de compra." >&2; \
      echo "  Defina MART_WHATSAPP_NUMBER na stack (só dígitos, com DDI+DDD, ex.: 5511999999999)" >&2; \
      echo "  ou passe VITE_WHATSAPP_NUMBER=none para construir sem pedido de propósito." >&2; \
      exit 1; \
    fi; \
  fi

# A prévia de link depende do HTML cru: confere que a imagem padrão existe, que
# nenhum %VITE_*% ficou sem substituir e que o Vite preservou o SSI. E que o
# número do WhatsApp de fato entrou no bundle.
RUN npm run build && test -f dist/index.html && test -f dist/og-default.png \
  && ! grep -q "%VITE_" dist/index.html \
  && grep -q "<!--# include virtual=" dist/index.html \
  && { [ "$VITE_WHATSAPP_NUMBER" = "none" ] \
       || grep -rqF -- "$VITE_WHATSAPP_NUMBER" dist/assets; }

# ---------- produção ----------
FROM nginx:alpine AS production

RUN apk add --no-cache wget

COPY --from=builder /app/dist /usr/share/nginx/html
# nginx.conf é template: o entrypoint da imagem roda envsubst nele no start e
# grava em /etc/nginx/conf.d/default.conf (ver o comentário no topo dele).
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Defaults do template. A API é alcançada pela rede interna da stack só para a
# prévia por produto e o sitemap; o navegador segue usando o domínio público.
ARG VITE_SITE_URL=https://mart.gwan.cloud
ENV MART_SITE_URL=$VITE_SITE_URL
ENV MART_API_UPSTREAM=gwan-mart-backend:3011
# Faz o entrypoint da imagem exportar NGINX_LOCAL_RESOLVERS a partir do
# /etc/resolv.conf (na gwan-network: 127.0.0.11), usado pelo `resolver`.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
