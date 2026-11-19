import random
import unittest

from ai_agent import choose_ai_decision, choose_best_deployment
from engine import CARD_CATALOG


class TestAiAgent(unittest.TestCase):
    def test_placement_uses_cards_from_hand_and_obeys_middle_constraint(self):
        hand = [CARD_CATALOG[index] for index in (0, 4, 12)]
        deployment = choose_best_deployment(hand, "even_only")
        self.assertEqual(len(deployment), 3)
        self.assertEqual(set(deployment), {card["id"] for card in hand})
        middle = next(card for card in hand if card["id"] == deployment[1])
        self.assertEqual(middle["level"] % 2, 0)

    def test_ai_decision_chooses_documented_stances_deterministically(self):
        hand = [CARD_CATALOG[index] for index in (0, 4, 12)]
        _, lethal_stance = choose_ai_decision(hand, "open_field", 4, 3, 1, 1, 1, random.Random(0))
        self.assertEqual(lethal_stance, "EVEN")
        _, charge_stance = choose_ai_decision(hand, "open_field", 1, 3, 3, 1, 1, random.Random(0))
        self.assertIn(charge_stance, ("ODD", "EVEN"))


if __name__ == "__main__":
    unittest.main()
