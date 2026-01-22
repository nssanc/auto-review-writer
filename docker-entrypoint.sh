#!/bin/sh
set -e

echo "Starting Literature Review AI..."

# 确保数据目录存在并设置正确的权限
mkdir -p /app/data /app/uploads /app/outputs
chown -R nextjs:nodejs /app/data /app/uploads /app/outputs
chmod -R 755 /app/data /app/uploads /app/outputs

echo "Data directories created with proper permissions"

# 切换到 nextjs 用户并启动应用
echo "Starting application as nextjs user..."
exec gosu nextjs node server.js
