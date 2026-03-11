#!/bin/bash

# Shadow-Bees V2 开发环境启动脚本
# 使用 Node.js 18

NODE_BIN="/tmp/node-v18.20.4-darwin-x64/bin/node"
NPM_CLI="/tmp/node-v18.20.4-darwin-x64/lib/node_modules/npm/bin/npm-cli.js"
export PATH="/tmp/node-v18.20.4-darwin-x64/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export DATABASE_URL="postgresql://sb_admin:shadowbees123@localhost:5432/shadowbees"
export REDIS_URL=""
export JWT_SECRET="dev-secret-key"

cd /Users/frank/Desktop/shadow-bees-v52/backend

echo "🚀 启动 Shadow-Bees 后端服务..."
echo ""

# 启动 Gateway (Port 3000)
echo "📡 启动 Gateway (Port 3000)..."
cd packages/gateway
env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$DATABASE_URL" JWT_SECRET="$JWT_SECRET" $NODE_BIN $NPM_CLI run dev > /tmp/sb-gateway.log 2>&1 &
GATEWAY_PID=$!
echo "   Gateway PID: $GATEWAY_PID"
cd ../..

sleep 2

# 启动 Hotel Service (Port 3001)
echo "🏨 启动 Hotel Service (Port 3001)..."
cd packages/services/hotel-service
env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$DATABASE_URL" PORT=3001 $NODE_BIN $NPM_CLI run dev > /tmp/sb-hotel.log 2>&1 &
HOTEL_PID=$!
echo "   Hotel Service PID: $HOTEL_PID"
cd ../../..

sleep 2

# 启动 Order Service (Port 3002)
echo "📦 启动 Order Service (Port 3002)..."
cd packages/services/order-service
env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$DATABASE_URL" PORT=3002 $NODE_BIN $NPM_CLI run dev > /tmp/sb-order.log 2>&1 &
ORDER_PID=$!
echo "   Order Service PID: $ORDER_PID"
cd ../../..

echo ""
echo "✅ 服务启动中..."
echo ""
echo "查看日志:"
echo "  tail -f /tmp/sb-gateway.log"
echo "  tail -f /tmp/sb-hotel.log"
echo "  tail -f /tmp/sb-order.log"
echo ""
echo "停止所有服务: kill $GATEWAY_PID $HOTEL_PID $ORDER_PID"
