# Single-stage build para compatibilidade com módulos nativos (sqlite3)
# Node 16 (Debian buster) está EOL e pode quebrar o apt-get.
FROM node:18-bookworm-slim

# Instalar dependências do sistema necessárias para sqlite3 e timezone
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/app

# Copiar package.json e package-lock.json
COPY ./src/package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY ./src ./

# O repositório ignora src/config.ts no build (via .dockerignore) para não "bakar" configs locais.
# Porém o TypeScript precisa do módulo ./config para compilar.
# Então, durante o build, criamos um config.ts de fallback a partir do sample-config.ts.
RUN test -f config.ts || cp sample-config.ts config.ts

# Compilar TypeScript
RUN npm run build

EXPOSE 3000
CMD [ "npm", "start" ]