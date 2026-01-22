#!/bin/bash

# 初始化数据库
echo "初始化数据库..."
npm run db:init

# 启动应用
echo "启动应用..."
npm run dev
