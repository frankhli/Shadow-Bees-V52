# Shadow-Bees Hotel Service Dockerfile
# 兼容 CentOS 7.9 - 使用 Node 20 完整版（非 Alpine）

FROM node:20 AS builder

WORKDIR /app

# 复制 package.json
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 从 shared 复制 prisma schema
COPY ../../shared/prisma/schema.prisma ./prisma/

# 生成 Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# 构建应用
RUN npm run build

# 生产镜像
FROM node:20

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# 使用非 root 用户运行
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

EXPOSE 3001

CMD ["node", "dist/main"]
