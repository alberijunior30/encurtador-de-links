# Etapa de build: gera o dist com Vite.
# VITE_USE_MOCK não é definido: a imagem usa a API real (padrão).
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa final: nginx servindo o dist na porta 80.
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
