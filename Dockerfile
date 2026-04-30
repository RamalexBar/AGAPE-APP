FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package.json ./
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production

# Comando de inicio
CMD ["node", "src/index.js"]
