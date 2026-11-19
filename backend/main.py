"""FastAPI adapter for the 3-lane tactical game."""

import json
import random
from typing import Dict

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from ai_agent import choose_ai_decision
from database import engine, get_db
from engine import CARD_CATALOG, LANE_CONSTRAINTS, GameState, resolve_round

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="3-Lane Parity Tactical Game API")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# In-process session state holds the private, shuffled decks and current hands.
active_games: Dict[int, GameState] = {}


def _deal(state: GameState) -> None:
    state.player_hand, state.player_deck = state.player_deck[:3], state.player_deck[3:]
    state.enemy_hand, state.enemy_deck = state.enemy_deck[:3], state.enemy_deck[3:]


def _constraint() -> Dict[str, str]:
    constraint_id = random.choice(list(LANE_CONSTRAINTS))
    return {"id": constraint_id, "name": LANE_CONSTRAINTS[constraint_id]["name"]}


@app.get("/health")
def health_check():
    return {"status": "awake"}


@app.post("/api/game/start", response_model=schemas.StartGameResponse)
def start_game(db: Session = Depends(get_db)):
    game = models.Game()
    db.add(game)
    db.commit()
    db.refresh(game)
    player_deck = random.sample(CARD_CATALOG, len(CARD_CATALOG))
    enemy_deck = random.sample(CARD_CATALOG, len(CARD_CATALOG))
    state = GameState(player_deck=player_deck, enemy_deck=enemy_deck)
    _deal(state)
    active_games[game.id] = state
    constraint = _constraint()
    # Current constraint is cached with the session to keep it stable this round.
    state.constraint_id = constraint["id"]
    return {
        "game_id": game.id, "player_hp": state.player_hp, "enemy_hp": state.enemy_hp,
        "player_atk": state.player_atk, "enemy_atk": state.enemy_atk,
        "player_hand": state.player_hand, "lane_constraint": constraint,
    }


@app.post("/api/game/resolve", response_model=schemas.ResolveRoundResponse)
def resolve_game_round(req: schemas.ResolveRoundRequest, db: Session = Depends(get_db)):
    game = db.query(models.Game).filter(models.Game.id == req.game_id).first()
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    state = active_games.get(game.id)
    if state is None:
        raise HTTPException(status_code=409, detail="Game session expired; start a new game.")
    if state.status != "ongoing":
        raise HTTPException(status_code=400, detail="Game is already over.")
    try:
        enemy_deployment, enemy_stance = choose_ai_decision(
            state.enemy_hand, state.constraint_id, state.round_number,
            state.enemy_hp, state.player_hp, state.enemy_atk, state.player_atk,
        )
        result = resolve_round(
            req.player_deployment, enemy_deployment, state.player_hand, state.enemy_hand,
            req.player_stance, enemy_stance, state.constraint_id, state,
        )
    except (ValueError, KeyError, StopIteration) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    record = models.Round(
        game_id=game.id,
        player_hand=json.dumps([card["id"] for card in state.player_hand]),
        enemy_hand=json.dumps([card["id"] for card in state.enemy_hand]),
        player_deployment=json.dumps(req.player_deployment),
        enemy_deployment=json.dumps(enemy_deployment),
        total_score=result["player_total_score"] - result["enemy_total_score"],
        damage_to=(
            "enemy" if result["winner"] == "player" and req.player_stance == "EVEN"
            else "player" if result["winner"] == "enemy" and enemy_stance == "EVEN"
            else None
        ),
        battle_log=json.dumps(result, ensure_ascii=False),
    )
    game.player_hp, game.enemy_hp = state.player_hp, state.enemy_hp
    game.status = state.status
    db.add(record)
    db.commit()

    next_hand, next_constraint = [], None
    next_round_number = None
    if not result["game_over"]:
        state.round_number += 1
        _deal(state)
        next_hand = state.player_hand
        constraint = _constraint()
        state.constraint_id = constraint["id"]
        next_constraint = constraint
        next_round_number = state.round_number
    else:
        active_games.pop(game.id, None)
    return {
        "game_id": game.id, "round_result": result,
        "enemy_deployment": enemy_deployment, "enemy_stance": enemy_stance,
        "player_hp": state.player_hp, "enemy_hp": state.enemy_hp,
        "player_atk": state.player_atk, "enemy_atk": state.enemy_atk,
        "game_over": result["game_over"], "winner": result["game_winner"],
        "next_round_number": next_round_number,
        "next_player_hand": next_hand, "next_lane_constraint": next_constraint,
    }
