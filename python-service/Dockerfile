FROM python:3.11-slim

WORKDIR /app

# 编译 + 运行时依赖
# gcc/g++ 用于 pip install 编译；libgfortran5/libgomp1 是 numpy/scipy/xgboost 运行时需要的
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    libgfortran5 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY python-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY python-service/app.py .
COPY python-service/external_data.py .
RUN mkdir -p data models

# 预热 AKShare（可选，减少首次请求延迟）
RUN python -c "import akshare; print('AKShare ready')" 2>/dev/null || echo "AKShare unavailable (will use mock data)"

# gunicorn 生产模式，单 worker（Free 计划内存有限）
CMD gunicorn --bind 0.0.0.0:${PORT:-5001} --timeout 120 --workers 1 --preload app:app
