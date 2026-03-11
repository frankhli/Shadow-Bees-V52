#!/bin/bash
# Shadow-Bees V52 一键部署脚本

echo "🐝 Shadow-Bees V52 部署脚本"
echo "=============================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 构建项目
echo ""
echo "🔨 构建项目..."
npm run build

# 检查构建结果
if [ -d "dist" ]; then
    echo "✅ 构建成功！dist 目录已生成"
    ls -la dist/
else
    echo "❌ 构建失败，未找到 dist 目录"
    exit 1
fi

# 本地预览（可选）
echo ""
echo "🚀 启动本地预览服务器..."
echo "访问地址: http://localhost:5173"
echo "按 Ctrl+C 停止服务器"
echo ""

npm run preview
