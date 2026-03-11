#!/bin/bash
echo "🚀 负载测试"
API_BASE="http://localhost:3000/api"
for i in {1..10}; do
  curl -s "$API_BASE/hotels" > /dev/null &
done
wait
echo "✅ 10个并发请求完成"
