# Etapa de contruccion
FROM node:18 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Etapa de producción
FROM node:18 AS runner
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3003
CMD ["npm", "start"]