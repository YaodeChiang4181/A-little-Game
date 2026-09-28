from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import random
import json

import models
import schemas
from database import engine, get_db
from engine import resolve_round, apply_damage, GameState, CARD_POOL, HAND_SIZE
from ai_agent import choose_best_deployment

# 儲存每局當下的敵方手牌 (Memory Cache)
active_enemy_hands: Dict[int, List[int]] = {}

# 建立資料庫資料表
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Parity Battle Engine API")

# 設定 CORS (允許前端訪問)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 開發階段允許所有來源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "awake"}

def draw_hand() -> List[int]:
    return random.sample(CARD_POOL, HAND_SIZE)

@app.post("/api/game/start", response_model=schemas.StartGameResponse)
def start_game(db: Session = Depends(get_db)):
    # 建立新遊戲，初始雙方滿血 3 滴
    game = models.Game()
    db.add(game)
    db.commit()
    db.refresh(game)
    
    # 抽取玩家與敵方初始手牌
    player_hand = draw_hand()
    enemy_hand = draw_hand()
    
    # 紀錄敵方手牌並計算回合可用牌池 (唯一值)
    active_enemy_hands[game.id] = enemy_hand
    round_pool = sorted(list(set(player_hand + enemy_hand)))
    
    return {
        "game_id": game.id,
        "player_hp": game.player_hp,
        "enemy_hp": game.enemy_hp,
        "player_hand": player_hand,
        "round_pool": round_pool,
        "player_role": "ODD",
        "enemy_role": "EVEN"
    }

@app.post("/api/game/resolve", response_model=schemas.ResolveRoundResponse)
def resolve_game_round(req: schemas.ResolveRoundRequest, db: Session = Depends(get_db)):
    game = db.query(models.Game).filter(models.Game.id == req.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
        
    if game.status != "ongoing":
        raise HTTPException(status_code=400, detail=f"Game is already over. Status: {game.status}")
        
    round_count = db.query(models.Round).filter(models.Round.game_id == game.id).count()
    round_number = round_count + 1
    
    # 取得本回合已抽好的敵方手牌
    enemy_hand = active_enemy_hands.get(game.id)
    if not enemy_hand:
        # Fallback (防錯)
        enemy_hand = draw_hand()
        
    enemy_deployment = choose_best_deployment(enemy_hand, round_number=round_number)
    
    # 核心引擎結算此局戰鬥
    try:
        result = resolve_round(req.player_deployment, enemy_deployment, round_number=round_number)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # 套用傷害並更新資料庫
    state = GameState()
    state.player_hp = game.player_hp
    state.enemy_hp = game.enemy_hp
    apply_damage(state, result["damage_to"])
    
    game.player_hp = state.player_hp
    game.enemy_hp = state.enemy_hp
    
    # 判斷勝負條件
    game_over = False
    winner = None
    if game.player_hp <= 0:
        game.status = "enemy_win"
        game_over = True
        winner = "enemy"
    elif game.enemy_hp <= 0:
        game.status = "player_win"
        game_over = True
        winner = "player"
        
    # 儲存此局的詳細對戰紀錄到資料庫 (Round 表)
    round_record = models.Round(
        game_id=game.id,
        player_hand=json.dumps(req.player_hand),
        enemy_hand=json.dumps(enemy_hand),
        player_deployment=json.dumps(req.player_deployment),
        enemy_deployment=json.dumps(enemy_deployment),
        total_score=result["total_score"],
        damage_to=result["damage_to"],
        battle_log=json.dumps(result["battles"])
    )
    db.add(round_record)
    db.commit()
    
    # 若遊戲尚未結束，為玩家與對手抽出下一回合手牌
    if not game_over:
        next_player_hand = draw_hand()
        next_enemy_hand = draw_hand()
        active_enemy_hands[game.id] = next_enemy_hand
        next_round_pool = sorted(list(set(next_player_hand + next_enemy_hand)))
    else:
        next_player_hand = []
        next_round_pool = []
        active_enemy_hands.pop(game.id, None)
    
    next_round_number = round_number + 1
    next_player_is_odd = (next_round_number % 2 != 0)
    
    return {
        "game_id": game.id,
        "enemy_deployment": enemy_deployment,
        "battles": result["battles"],
        "total_score": result["total_score"],
        "damage_to": result["damage_to"],
        "player_role": "ODD" if next_player_is_odd else "EVEN",
        "enemy_role": "EVEN" if next_player_is_odd else "ODD",
        "player_hp": game.player_hp,
        "enemy_hp": game.enemy_hp,
        "game_over": game_over,
        "winner": winner,
        "next_player_hand": next_player_hand,
        "next_round_pool": next_round_pool
    }
