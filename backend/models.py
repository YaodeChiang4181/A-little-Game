from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    player_hp = Column(Integer, default=3)
    enemy_hp = Column(Integer, default=3)
    status = Column(String, default="ongoing") # ongoing, player_win, enemy_win
    
    rounds = relationship("Round", back_populates="game")

class Round(Base):
    __tablename__ = "rounds"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"))
    
    player_hand = Column(String) # JSON string of list
    enemy_hand = Column(String)  # JSON string of list
    
    player_deployment = Column(String) # JSON string
    enemy_deployment = Column(String)  # JSON string
    
    total_score = Column(Integer)
    damage_to = Column(String)
    
    # 詳細戰報記錄 (JSON 字串)
    battle_log = Column(String)

    game = relationship("Game", back_populates="rounds")
