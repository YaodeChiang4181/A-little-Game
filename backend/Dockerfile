# 使用官方輕量版 Python 映像
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 複製需求文件並安裝套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有後端程式碼到映像中
COPY . .

# 暴露 8000 埠
EXPOSE 8000

# 啟動 FastAPI 伺服器
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
