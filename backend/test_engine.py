import unittest

from engine import CARD_CATALOG, GameState, InvalidDeploymentError, resolve_round, validate_deployment


class TestTacticalParityEngine(unittest.TestCase):
    def setUp(self):
        self.player_hand = [CARD_CATALOG[i] for i in (0, 4, 8)]
        self.enemy_hand = [CARD_CATALOG[i] for i in (1, 5, 9)]

    def test_standard_deck_and_deployment_validation(self):
        self.assertEqual(len(CARD_CATALOG), 15)
        self.assertEqual(sorted(card["level"] for card in CARD_CATALOG), [1] * 4 + [2] * 4 + [3] * 4 + [4] * 3)
        validate_deployment([card["id"] for card in self.player_hand], self.player_hand)
        with self.assertRaises(InvalidDeploymentError):
            validate_deployment([self.player_hand[0]["id"]] * 3, self.player_hand)
        with self.assertRaises(InvalidDeploymentError):
            validate_deployment(["not_in_hand", self.player_hand[1]["id"], self.player_hand[2]["id"]], self.player_hand)

    def test_lane_constraint_and_score_multiplier(self):
        state = GameState()
        result = resolve_round(
            [card["id"] for card in self.player_hand], [card["id"] for card in self.enemy_hand],
            self.player_hand, self.enemy_hand, "ODD", "ODD", "even_only", state,
        )
        self.assertEqual([lane["multiplier"] for lane in result["lanes"]], [1, 2, 1])
        self.assertTrue(result["lanes"][1]["player_constraint_violated"])
        self.assertEqual(result["lanes"][1]["player_effective_level"], 0)
        self.assertEqual(result["player_total_score"], sum(lane["player_score"] for lane in result["lanes"]))

    def test_winner_stance_and_tie(self):
        state = GameState(player_atk=2)
        player = [CARD_CATALOG[12], CARD_CATALOG[8], CARD_CATALOG[14]]
        enemy = [CARD_CATALOG[0], CARD_CATALOG[1], CARD_CATALOG[2]]
        result = resolve_round(
            [card["id"] for card in player], [card["id"] for card in enemy],
            player, enemy, "EVEN", "ODD", "open_field", state,
        )
        self.assertEqual(result["winner"], "player")
        self.assertEqual(state.enemy_hp, 1)
        self.assertEqual(state.player_atk, 1)

        tie_state = GameState()
        same_hand = [CARD_CATALOG[2], CARD_CATALOG[6], CARD_CATALOG[8]]
        tie = resolve_round(
            [card["id"] for card in same_hand], [card["id"] for card in same_hand],
            same_hand, same_hand, "ODD", "EVEN", "open_field", tie_state,
        )
        self.assertEqual(tie["winner"], "tie")
        self.assertEqual(tie_state.player_atk, 1)
        self.assertEqual(tie_state.enemy_hp, 3)

    def test_round_five_tiebreak(self):
        state = GameState(round_number=5, round_history=[
            {"round": n, "player_score": 10, "enemy_score": 4} for n in range(1, 5)
        ])
        hand = [CARD_CATALOG[i] for i in (2, 6, 8)]
        result = resolve_round(
            [card["id"] for card in hand], [card["id"] for card in hand],
            hand, hand, "ODD", "EVEN", "open_field", state,
        )
        self.assertTrue(result["game_over"])
        self.assertEqual(result["game_winner"], "player")
        self.assertEqual(result["win_reason"], "ROUND_LIMIT_TOTAL_SCORE")


if __name__ == "__main__":
    unittest.main()
