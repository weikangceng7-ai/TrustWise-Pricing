#!/bin/bash
# 启动硫磺价格预测服务

cd "$(dirname "$0")"

# 检查 Python 环境
if ! command -v python &> /dev/null; then
    echo "Python 未安装，请先安装 Python 3.9+"
    exit 1
fi

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

# 安装依赖
echo "安装依赖..."
pip install -r requirements.txt

# 创建数据和模型目录
mkdir -p data models

# 启动服务
echo "启动预测服务..."
PORT=${PORT:-5001}
python app.py