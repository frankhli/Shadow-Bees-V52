# Shadow-Bees V2 后端 Makefile

.PHONY: help install db-up db-down db-reset migrate seed dev build clean

# 默认显示帮助
help:
	@echo "Shadow-Bees V2 后端命令"
	@echo ""
	@echo "基础设施:"
	@echo "  make db-up       启动数据库 (PostgreSQL + Redis)"
	@echo "  make db-down     停止数据库"
	@echo "  make db-reset    重置数据库（删除数据）"
	@echo ""
	@echo "数据库操作:"
	@echo "  make migrate     执行数据库迁移"
	@echo "  make seed        填充种子数据"
	@echo "  make db-init     初始化数据库（迁移+种子）"
	@echo ""
	@echo "开发:"
	@echo "  make dev         启动所有服务（开发模式）"
	@echo "  make dev-gateway 仅启动 Gateway"
	@echo "  make dev-ai      仅启动 AI 服务"
	@echo ""
	@echo "构建:"
	@echo "  make build       构建所有服务"
	@echo "  make clean       清理构建产物"
	@echo ""
	@echo "数据迁移:"
	@echo "  make migrate-pb  从 PocketBase 迁移数据"

# ==========================================
# 基础设施
# ==========================================
db-up:
	docker-compose up -d
	@echo "等待数据库启动..."
	@sleep 3
	@docker-compose ps

db-down:
	docker-compose down

db-reset:
	docker-compose down -v
	rm -rf docker-data

# ==========================================
# 数据库操作
# ==========================================
migrate:
	cd packages/shared && npx prisma migrate dev

seed:
	cd packages/shared && npx prisma db seed

db-init: migrate seed

# ==========================================
# 开发
# ==========================================
dev:
	@echo "启动所有服务..."
	@concurrently \
		"make dev-gateway" \
		"make dev-hotel" \
		"make dev-order" \
		"make dev-ai"

dev-gateway:
	cd packages/gateway && npm run dev

dev-hotel:
	cd packages/services/hotel-service && npm run dev

dev-order:
	cd packages/services/order-service && npm run dev

dev-ai:
	cd packages/ai-service && python -m uvicorn main:app --reload --port 5000

# ==========================================
# 构建
# ==========================================
build:
	cd packages/shared && npm run build
	cd packages/gateway && npm run build
	cd packages/services/hotel-service && npm run build
	cd packages/services/order-service && npm run build

clean:
	find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.log" -delete 2>/dev/null || true

# ==========================================
# 数据迁移
# ==========================================
migrate-pb:
	cd scripts && npx ts-node migrate-from-pocketbase.ts
