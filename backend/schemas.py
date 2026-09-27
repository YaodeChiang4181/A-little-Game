from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class StartGameResponse(BaseModel):
    game_id: int
    player_hp: int
    enemy_hp: int
    player_hand: List[int]
    player_role: str = "ODD"
    enemy_role: str = "EVEN"

class ResolveRoundRequest(BaseModel):
    game_id: int
    player_deployment: List[int]
    player_hand: List[int]

class ResolveRoundResponse(BaseModel):
    game_id: int
    enemy_deployment: List[int]
    battles: List[Dict[str, Any]]
    total_score: int
    damage_to: str
    player_role: str
    enemy_role: str
    player_hp: int
    enemy_hp: int
    game_over: bool
    winner: Optional[str] = None
    next_player_hand: List[int] = []
