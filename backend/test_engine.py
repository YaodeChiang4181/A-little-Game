import unittest
from engine import resolve_round, validate_deployment, apply_damage, GameState, InvalidDeploymentError

class TestParityBattleEngine(unittest.TestCase):
    
    def test_case_1_basic_chain_and_multiplier(self):
        # Test Case 1: 基礎連鎖與倍率手動驗證
        player_deployment = [6, 1, 3] # ODD
        enemy_deployment = [2, 4, 5]  # EVEN
        
        result = resolve_round(player_deployment, enemy_deployment)
        
        # 戰場 1: p'_1=6, e'_1=2, diff=4, score=4. Player wins. buff_p=1
        self.assertEqual(result["battles"][0]["player_eff"], 6)
        self.assertEqual(result["battles"][0]["enemy_eff"], 2)
        self.assertEqual(result["battles"][0]["score"], 4)
        self.assertEqual(result["battles"][0]["winner"], "player")
        
        # 戰場 2: p'_2=1+1=2, e'_2=4, diff=2, score=4. Enemy wins. buff_e=1
        self.assertEqual(result["battles"][1]["player_eff"], 2)
        self.assertEqual(result["battles"][1]["enemy_eff"], 4)
        self.assertEqual(result["battles"][1]["score"], 4)
        self.assertEqual(result["battles"][1]["winner"], "enemy")
        
        # 戰場 3: p'_3=3, e'_3=5+1=6, diff=3, score=9.
        self.assertEqual(result["battles"][2]["player_eff"], 3)
        self.assertEqual(result["battles"][2]["enemy_eff"], 6)
        self.assertEqual(result["battles"][2]["score"], 9)
        self.assertEqual(result["battles"][2]["winner"], "enemy")
        
        # 總分斷言
        self.assertEqual(result["total_score"], 17)
        # 奇偶判斷 (奇數方攻擊，對手扣血)
        self.assertEqual(result["total_score"] % 2, 1)
        self.assertEqual(result["damage_to"], "enemy")

    def test_case_2_tie_no_buff(self):
        # Test Case 2: 平手無連鎖 Buff
        player_deployment = [3, 2, 5]
        enemy_deployment = [3, 6, 1]
        
        result = resolve_round(player_deployment, enemy_deployment)
        
        # 戰場 1: tie, diff=0, both buffs should be 0 next round
        self.assertEqual(result["battles"][0]["winner"], "tie")
        
        # 戰場 2: p'_2=2, e'_2=6, diff=4, score=8. Enemy wins, buff_e=1.
        self.assertEqual(result["battles"][1]["player_eff"], 2)
        self.assertEqual(result["battles"][1]["enemy_eff"], 6)
        self.assertEqual(result["battles"][1]["score"], 8)
        self.assertEqual(result["battles"][1]["winner"], "enemy")
        
        # 戰場 3: p'_3=5, e'_3=1+1=2, diff=3, score=9.
        self.assertEqual(result["battles"][2]["player_eff"], 5)
        self.assertEqual(result["battles"][2]["enemy_eff"], 2)
        self.assertEqual(result["battles"][2]["score"], 9)
        
        self.assertEqual(result["total_score"], 17)
        self.assertEqual(result["damage_to"], "enemy")

    def test_case_3_boundary_and_validation(self):
        # Test Case 3: 邊界防禦與不變量檢查
        
        # 牌型合法性檢查: 長度不對
        with self.assertRaises(InvalidDeploymentError):
            validate_deployment([1, 2])
            
        # 牌型合法性檢查: 有重複
        with self.assertRaises(InvalidDeploymentError):
            validate_deployment([1, 1, 2])
            
        # 牌型合法性檢查: 不在範圍內
        with self.assertRaises(InvalidDeploymentError):
            validate_deployment([1, 2, 7])
            
        # 生命值下限
        state = GameState()
        self.assertEqual(state.player_hp, 3)
        self.assertEqual(state.enemy_hp, 3)
        
        apply_damage(state, "enemy")
        self.assertEqual(state.enemy_hp, 2)
        
        apply_damage(state, "enemy")
        apply_damage(state, "enemy")
        self.assertEqual(state.enemy_hp, 0)
        
        # 扣血後不為負值
        apply_damage(state, "enemy")
        self.assertEqual(state.enemy_hp, 0)
        
if __name__ == '__main__':
    unittest.main()
