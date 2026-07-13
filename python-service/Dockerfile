FROM python:3.11-slim

WORKDIR /app

# 系统依赖（AKShare 需要的一些基础库）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制源码
COPY app.py .
RUN mkdir -p data models

# 预热 AKShare（可选，减少首次请求延迟）
RUN python -c "import akshare; print('AKShare ready')" 2>/dev/null || echo "AKShare unavailable (will use mock data)"

EXPOSE 5001

# gunicorn 生产模式，关闭 debug
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--timeout", "120", "--workers", "2", "app:app"]
