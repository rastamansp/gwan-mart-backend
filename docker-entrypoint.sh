#!/bin/sh
set -e

# Entrypoint do Gwan Mart Backend.
#
# A versão anterior era do gwan-events-backend ("Starting Gwan Events Backend")
# e esperava DB_HOST/DB_PORT — variáveis que esta aplicação não usa: a conexão
# vem de DATABASE_URL. Como DB_HOST nunca era definido, a espera pelo banco caía
# direto no "skip". E o arquivo sequer era executado: o Dockerfile não tinha
# ENTRYPOINT, então o passo de migrations que ele prometia nunca rodava.
#
# Agora ele é o ENTRYPOINT de verdade, e aplicar as migrations é responsabilidade
# dele — sem isso um deploy em banco vazio sobe uma API sem tabela alguma.

echo "🎯 Iniciando Gwan Mart Backend..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não configurada. Abortando."
  exit 1
fi

# Espera o PostgreSQL aceitar conexão. O host/porta saem da própria DATABASE_URL
# (postgresql://usuario:senha@host:porta/banco), sem variável duplicada.
DB_HOSTPORT=$(printf '%s' "$DATABASE_URL" | sed -e 's|^.*://||' -e 's|^[^@]*@||' -e 's|/.*$||')
DB_HOST=$(printf '%s' "$DB_HOSTPORT" | cut -d: -f1)
DB_PORT=$(printf '%s' "$DB_HOSTPORT" | cut -s -d: -f2)
DB_PORT=${DB_PORT:-5432}

echo "⏳ Aguardando PostgreSQL em $DB_HOST:$DB_PORT..."
i=1
while [ "$i" -le 30 ]; do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "✅ PostgreSQL respondendo."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ PostgreSQL não respondeu em 30 tentativas. Abortando."
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done

# Migrations: falha aqui aborta o start. Usa o alvo :prod, que roda o CLI sobre
# o JS compilado — a imagem de producao nao tem tsconfig-paths para o ts-node.
#
# O schema NÃO é mais criado por `synchronize` — em produção ele sempre foi
# false, e agora está false também em dev. Se a migration falhar e a aplicação
# subir assim mesmo, o resultado é uma API "saudável" respondendo 500 em todas as
# rotas de catálogo. Melhor não subir.
echo "📦 Aplicando migrations..."
if npm run typeorm:migration:run:prod; then
  echo "✅ Migrations aplicadas."
else
  echo "❌ Falha ao aplicar migrations. Abortando o start."
  exit 1
fi

echo "🚀 Iniciando aplicação NestJS..."
if [ -f dist/src/main.js ]; then
  exec node dist/src/main.js
elif [ -f dist/main.js ]; then
  exec node dist/main.js
else
  echo "❌ main.js não encontrado em dist/."
  find dist -name 'main.js' -type f
  exit 1
fi
