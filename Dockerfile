# Single-stage build para compatibilidade com módulos nativos (sqlite3)
FROM node:16-slim

# Instalar dependências do sistema necessárias para sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/app

# Copiar package.json e package-lock.json
COPY ./src/package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY ./src ./

# Compilar TypeScript
RUN npm run build

EXPOSE 3000
CMD [ "npm", "start" ]