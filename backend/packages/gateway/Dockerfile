# Shadow-Bees API Gateway Dockerfile
FROM node:20 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs
EXPOSE 3000
CMD ["node", "dist/main"]
