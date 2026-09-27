import itertools
from typing import List
from engine import resolve_round, CARD_POOL

def choose_best_deployment(hand: List[int], round_number: int = 1) -> List[int]:
    """
    為 AI 計算最佳出牌順序。
    遍歷手牌的 6 種排列組合，並假設玩家的部署為隨機均勻分佈（遍歷所有 120 種可能）。
    找出能使己方（AI）不受傷害的機率最高的排列。
    """
    my_permutations = [list(p) for p in itertools.permutations(hand)]
    opponent_deployments = [list(p) for p in itertools.permutations(CARD_POOL, 3)]
    
    best_deployment = None
    best_win_rate = -1.0
    
    for my_dep in my_permutations:
        wins = 0
        total = len(opponent_deployments)
        
        for opp_dep in opponent_deployments:
            # 代入 engine 模擬，真正的 player_deployment 是 opp_dep
            result = resolve_round(player_deployment=opp_dep, enemy_deployment=my_dep, round_number=round_number)
            
            # 若傷害打在玩家身上，代表 AI 獲勝
            if result["damage_to"] == "player":
                wins += 1
                    
        win_rate = wins / total
        
        if win_rate > best_win_rate:
            best_win_rate = win_rate
            best_deployment = my_dep
            
    return best_deployment
