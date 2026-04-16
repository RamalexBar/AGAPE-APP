# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml* ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Instalar pnpm para ejecutar scripts si es necesario
RUN npm install -g pnpm

# Copiar dependencias y código desde el builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production

# Comando de inicio
CMD ["node", "src/index.js"]
