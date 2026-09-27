from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 輕量化資料庫 SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./game.db"

# 針對 SQLite 需要設定 check_same_thread=False
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 取得資料庫 Session 的依賴函數
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
