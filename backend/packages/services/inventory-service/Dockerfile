# Shadow-Bees Inventory Service Dockerfile
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY ../../shared/prisma/schema.prisma ./prisma/
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

FROM node:20

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

EXPOSE 3003

CMD ["node", "dist/main"]
