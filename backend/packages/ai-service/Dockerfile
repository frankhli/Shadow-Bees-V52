# Shadow-Bees AI Service Dockerfile
# 使用 Debian Slim 以兼容 CentOS 7.9

FROM python:3.11-slim

# 接收代理参数
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy

WORKDIR /app

# 安装系统依赖（包括 OpenSSL 和编译工具）
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 非 root 用户运行
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
