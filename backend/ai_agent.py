import itertools
from typing import List
from engine import resolve_round, CARD_POOL

def choose_best_deployment(hand: List[int], role: str) -> List[int]:
    """
    為 AI (EVEN) 計算最佳出牌順序。
    遍歷手牌的 6 種排列組合，並假設玩家的部署為隨機均勻分佈（遍歷所有 120 種可能）。
    找出能使最終總分 S 滿足己方條件 (EVEN 要偶數，ODD 要奇數) 機率最高的排列。
    """
    # 己方 6 種排列組合 (3! = 6)
    my_permutations = [list(p) for p in itertools.permutations(hand)]
    
    # 假設玩家出牌為隨機均勻分佈 (C(6,3) * 3! = 120 種可能)
    # 如果未來需要針對「已知玩家手牌」進行預測，只需將此處改為玩家手牌的 6 種排列即可。
    opponent_deployments = [list(p) for p in itertools.permutations(CARD_POOL, 3)]
    
    best_deployment = None
    best_win_rate = -1.0
    
    for my_dep in my_permutations:
        wins = 0
        total = len(opponent_deployments)
        
        for opp_dep in opponent_deployments:
            # 根據 role 決定代入 resolve_round 的順序
            # 依照規格：Player 1 (ODD), Player 2 (EVEN)
            if role.upper() == "EVEN":
                result = resolve_round(player_deployment=opp_dep, enemy_deployment=my_dep)
                # EVEN 希望最終總積分 S 為偶數
                if result["total_score"] % 2 == 0:
                    wins += 1
            else: # ODD
                result = resolve_round(player_deployment=my_dep, enemy_deployment=opp_dep)
                # ODD 希望最終總積分 S 為奇數
                if result["total_score"] % 2 != 0:
                    wins += 1
                    
        win_rate = wins / total
        
        # 尋找最高勝率
        if win_rate > best_win_rate:
            best_win_rate = win_rate
            best_deployment = my_dep
            
    # （可選）您可以印出找到的最佳勝率供 debug 參考
    # print(f"Best win rate for {role}: {best_win_rate*100:.2f}% with {best_deployment}")
    
    return best_deployment
