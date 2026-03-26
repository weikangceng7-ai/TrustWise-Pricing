@echo off
REM 启动硫磺价格预测服务

cd /d "%~dp0"

REM 检查 Python 环境
python --version >nul 2>&1
if errorlevel 1 (
    echo Python 未安装，请先安装 Python 3.9+
    exit /b 1
)

REM 创建虚拟环境（如果不存在）
if not exist "venv" (
    echo 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 安装依赖
echo 安装依赖...
pip install -r requirements.txt

REM 创建数据和模型目录
if not exist "data" mkdir data
if not exist "models" mkdir models

REM 设置端口
if "%PORT%"=="" set PORT=5001

REM 启动服务
echo 启动预测服务...
python app.py

pause