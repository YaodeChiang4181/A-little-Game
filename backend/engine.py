from typing import List, Tuple, Dict, Any

# Constants
MAX_HP = 3
CARD_POOL = [1, 2, 3, 4, 5, 6]
HAND_SIZE = 3
BATTLEFIELD_WEIGHTS = [1, 2, 3]  # [先鋒戰, 中軍戰, 決戰]
MOMENTUM_BUFF = 1               # 勝者獲得之等級加成

class InvalidDeploymentError(Exception):
    pass

class GameState:
    def __init__(self):
        self.player_hp = MAX_HP  
        self.enemy_hp = MAX_HP   

def validate_deployment(deployment: List[int]) -> None:
    if len(deployment) != HAND_SIZE:
        raise InvalidDeploymentError(f"Deployment must have exactly {HAND_SIZE} cards.")
    if len(set(deployment)) != HAND_SIZE:
        raise InvalidDeploymentError("Deployment cards must be unique.")
    for card in deployment:
        if card not in CARD_POOL:
            raise InvalidDeploymentError(f"Card {card} is not in the valid CARD_POOL {CARD_POOL}.")

def resolve_round(player_deployment: List[int], enemy_deployment: List[int], round_number: int = 1) -> Dict[str, Any]:
    """
    Resolves the round based on player and enemy deployments and the current round number.
    ODD / EVEN roles are swapped every round.
    Round 1: Player=ODD, Enemy=EVEN
    Round 2: Player=EVEN, Enemy=ODD
    """
    validate_deployment(player_deployment)
    validate_deployment(enemy_deployment)

    buff_P = 0
    buff_E = 0
    S = 0
    
    battles = []

    for i in range(HAND_SIZE):
        p_prime = player_deployment[i] + buff_P
        e_prime = enemy_deployment[i] + buff_E
        
        diff = abs(p_prime - e_prime)
        score = BATTLEFIELD_WEIGHTS[i] * diff
        S += score
        
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
        
    player_is_odd = (round_number % 2 != 0)
    
    if S % 2 != 0:
        damage_to = "enemy" if player_is_odd else "player"
    else:
        damage_to = "player" if player_is_odd else "enemy"
        
    return {
        "battles": battles,
        "total_score": S,
        "damage_to": damage_to,
        "player_role": "ODD" if player_is_odd else "EVEN",
        "enemy_role": "EVEN" if player_is_odd else "ODD"
    }

def apply_damage(state: GameState, damage_to: str) -> None:
    if damage_to == "enemy":
        state.enemy_hp = max(0, state.enemy_hp - 1)
    elif damage_to == "player":
        state.player_hp = max(0, state.player_hp - 1)
