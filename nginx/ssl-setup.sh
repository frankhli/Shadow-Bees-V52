#!/bin/bash
# SSL 证书自动申请脚本（Let's Encrypt 免费）

set -e

DOMAIN="api.shadowbees.com"
EMAIL="admin@shadowbees.com"

# 安装 Certbot
install_certbot() {
    if command -v certbot &> /dev/null; then
        echo "✅ Certbot 已安装"
        return
    fi

    echo "🔧 安装 Certbot..."
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        yum install -y certbot python3-certbot-nginx
    else
        echo "❌ 不支持的系统"
        exit 1
    fi
}

# 申请证书
request_cert() {
    echo "🔐 申请 SSL 证书 for $DOMAIN..."
    certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

    if [ $? -eq 0 ]; then
        echo "✅ 证书申请成功"
        echo "📂 证书位置: /etc/letsencrypt/live/$DOMAIN/"
    else
        echo "❌ 证书申请失败"
        exit 1
    fi
}

# 设置自动续期
setup_renewal() {
    echo "🔄 设置自动续期..."
    
    # 测试续期
    certbot renew --dry-run

    # 添加定时任务（每两周尝试续期）
    (crontab -l 2>/dev/null; echo "0 0 1,15 * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
    
    echo "✅ 自动续期已设置"
}

# 主流程
echo "================================"
echo "Shadow-Bees SSL 证书申请工具"
echo "域名: $DOMAIN"
echo "================================"
echo ""

install_certbot
request_cert
setup_renewal

echo ""
echo "✅ 全部完成！"
echo "📖 证书信息: certbot certificates"
echo "🔄 手动续期: certbot renew"
