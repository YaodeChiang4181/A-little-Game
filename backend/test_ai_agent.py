import unittest
from ai_agent import choose_best_deployment

class TestAIAgent(unittest.TestCase):
    def test_choose_best_deployment_even(self):
        # 測試 EVEN 角色 (AI)
        hand = [2, 4, 5]
        best_dep = choose_best_deployment(hand, "EVEN")
        
        # 確保回傳的是合法的排列
        self.assertEqual(len(best_dep), 3)
        self.assertEqual(set(best_dep), set(hand))
        
    def test_choose_best_deployment_odd(self):
        # 測試 ODD 角色 (雖然通常 AI 是 EVEN，但也可擴充)
        hand = [1, 3, 6]
        best_dep = choose_best_deployment(hand, "ODD")
        
        self.assertEqual(len(best_dep), 3)
        self.assertEqual(set(best_dep), set(hand))

if __name__ == '__main__':
    unittest.main()
