from typing import List, Tuple, Dict, Any

# Constants
MAX_HP = 3
CARD_POOL = [1, 2, 3, 4, 5, 6]
HAND_SIZE = 3
BATTLEFIELD_WEIGHTS = [1, 2, 3]  # [先鋒戰, 中軍戰, 決戰]
MOMENTUM_BUFF = 1               # 勝者獲得之等級加成

class InvalidDeploymentError(Exception):
    """Custom exception for invalid deployments."""
    pass

class GameState:
    def __init__(self):
        self.player_hp = MAX_HP  # ODD
        self.enemy_hp = MAX_HP   # EVEN

def validate_deployment(deployment: List[int]) -> None:
    if len(deployment) != HAND_SIZE:
        raise InvalidDeploymentError(f"Deployment must have exactly {HAND_SIZE} cards.")
    if len(set(deployment)) != HAND_SIZE:
        raise InvalidDeploymentError("Deployment cards must be unique.")
    for card in deployment:
        if card not in CARD_POOL:
            raise InvalidDeploymentError(f"Card {card} is not in the valid CARD_POOL {CARD_POOL}.")

def resolve_round(player_deployment: List[int], enemy_deployment: List[int]) -> Dict[str, Any]:
    """
    Resolves the round based on player (ODD) and enemy (EVEN) deployments.
    Returns a dictionary containing the battle logs, total score, and damage info.
    """
    validate_deployment(player_deployment)
    validate_deployment(enemy_deployment)

    buff_P = 0
    buff_E = 0
    S = 0
    
    battles = []

    for i in range(HAND_SIZE):
        # Calculate effective levels
        p_prime = player_deployment[i] + buff_P
        e_prime = enemy_deployment[i] + buff_E
        
        # Calculate diff and add to total score S
        diff = abs(p_prime - e_prime)
        score = BATTLEFIELD_WEIGHTS[i] * diff
        S += score
        
        # Determine winner for this battlefield
        if p_prime > e_prime:
            winner = "player"
            buff_P = MOMENTUM_BUFF
            buff_E = 0
        elif e_prime > p_prime:
            winner = "enemy"
            buff_P = 0
            buff_E = MOMENTUM_BUFF
        else:
            winner = "tie"
            buff_P = 0
            buff_E = 0
            
        battles.append({
            "battlefield": i + 1,
            "weight": BATTLEFIELD_WEIGHTS[i],
            "player_card": player_deployment[i],
            "enemy_card": enemy_deployment[i],
            "player_eff": p_prime,
            "enemy_eff": e_prime,
            "winner": winner,
            "diff": diff,
            "score": score
        })
        
    # Damage calculation based on parity of S
    if S % 2 != 0:
        damage_to = "enemy" # Odd score, Player (ODD) attacks
    else:
        damage_to = "player" # Even score, Enemy (EVEN) attacks
        
    return {
        "battles": battles,
        "total_score": S,
        "damage_to": damage_to
    }

def apply_damage(state: GameState, damage_to: str) -> None:
    if damage_to == "enemy":
        state.enemy_hp = max(0, state.enemy_hp - 1)
    elif damage_to == "player":
        state.player_hp = max(0, state.player_hp - 1)
