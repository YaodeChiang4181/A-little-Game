import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 載入 .env 檔案（如果存在）
load_dotenv()

# 從環境變數讀取 DATABASE_URL，若無則預設使用本地端的 SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./game.db")

# 判斷使用的資料庫類型
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite 需要 check_same_thread: False 設定
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # 處理 PostgreSQL (Neon 等線上資料庫)
    # 某些 PaaS 提供 postgres:// 開頭的 URL，SQLAlchemy 需替換為 postgresql://
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
