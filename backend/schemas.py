from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class StartGameResponse(BaseModel):
    game_id: int
    round_number: int = 1
    player_hp: int
    enemy_hp: int
    player_atk: int = 1
    enemy_atk: int = 1
    player_hand: List[Dict[str, Any]]
    lane_constraint: Dict[str, str]


class ResolveRoundRequest(BaseModel):
    game_id: int
    player_deployment: List[str]
    player_stance: str


class ResolveRoundResponse(BaseModel):
    game_id: int
    round_result: Dict[str, Any]
    enemy_deployment: List[str]
    enemy_stance: str
    player_hp: int
    enemy_hp: int
    player_atk: int
    enemy_atk: int
    game_over: bool
    winner: Optional[str] = None
    next_round_number: Optional[int] = None
    next_player_hand: List[Dict[str, Any]] = []
    next_lane_constraint: Optional[Dict[str, str]] = None
