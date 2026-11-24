# Etapa de build: instala só as dependências de produção.
# node:22-slim (Debian), não Alpine, por causa do better-sqlite3.
FROM node:22-slim AS build
WORKDIR /app
# Ferramentas para compilar o better-sqlite3 caso não exista binário pronto.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Etapa final: sem compiladores.
FROM node:22-slim
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/encurtador.sqlite
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
CMD ["npm", "start"]
