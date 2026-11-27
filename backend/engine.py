"""Rules engine for the README's 3-lane, 15-card parity game."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

Stance = Literal["ODD", "EVEN"]
Winner = Literal["player", "enemy", "tie"]
MAX_HP = 3
INITIAL_ATK = 1
MAX_ROUNDS = 5
HAND_SIZE = 3
LANE_MULTIPLIERS = (1, 2, 1)

# The standard registry mirrors frontend/src/game/registry/characters.ts.
CARD_CATALOG = [
    {"id": "scout_rogue", "name": "暗影盜賊", "level": 1, "trait": "flank"},
    {"id": "trapper_hunter", "name": "游擊陷阱兵", "level": 1, "trait": "snare"},
    {"id": "pawn_infantry_a", "name": "先鋒步兵", "level": 1, "trait": None},
    {"id": "pawn_infantry_b", "name": "列陣衛兵", "level": 1, "trait": None},
    {"id": "knight_guardian", "name": "重裝鐵士", "level": 2, "trait": "wall"},
    {"id": "duelist_assassin", "name": "核心刺客", "level": 2, "trait": "assassin"},
    {"id": "cavalry_rider_a", "name": "巡防遊騎", "level": 2, "trait": None},
    {"id": "cavalry_rider_b", "name": "輕裝戰士", "level": 2, "trait": None},
    {"id": "rook_bastion", "name": "堅石主塔", "level": 3, "trait": None},
    {"id": "catapult_siege", "name": "攻城投石車", "level": 3, "trait": None},
    {"id": "bishop_inquisitor", "name": "聖輝秘僧", "level": 3, "trait": None},
    {"id": "alchemist_transmute", "name": "鍊金術士", "level": 3, "trait": None},
    {"id": "bishop_archon", "name": "光輝大主教", "level": 4, "trait": None},
    {"id": "queen_command", "name": "王國女統領", "level": 4, "trait": None},
    {"id": "king_emperor", "name": "黑曜帝王", "level": 4, "trait": None},
]
CARD_BY_ID = {card["id"]: card for card in CARD_CATALOG}
LANE_CONSTRAINTS = {
    "odd_only": {"name": "奇數通行令"},
    "even_only": {"name": "偶數通行令"},
    "max_level_3": {"name": "輕裝突入令"},
    "min_level_2": {"name": "精銳衝鋒令"},
    "no_trait_only": {"name": "破法封魔域"},
    "open_field": {"name": "自由開闊域"},
}


class InvalidDeploymentError(ValueError):
    """Raised when a submitted lane assignment cannot be played."""


@dataclass
class GameState:
    player_hp: int = MAX_HP
    enemy_hp: int = MAX_HP
    player_atk: int = INITIAL_ATK
    enemy_atk: int = INITIAL_ATK
    round_number: int = 1
    player_deck: List[Dict[str, Any]] = field(default_factory=list)
    enemy_deck: List[Dict[str, Any]] = field(default_factory=list)
    player_hand: List[Dict[str, Any]] = field(default_factory=list)
    enemy_hand: List[Dict[str, Any]] = field(default_factory=list)
    round_history: List[Dict[str, int]] = field(default_factory=list)
    status: str = "ongoing"


def validate_deployment(deployment: List[str], hand: List[Dict[str, Any]]) -> None:
    if len(deployment) != HAND_SIZE or len(set(deployment)) != HAND_SIZE:
        raise InvalidDeploymentError("Deployment must assign three distinct cards, one to each lane.")
    hand_ids = {card["id"] for card in hand}
    if any(card_id not in hand_ids for card_id in deployment):
        raise InvalidDeploymentError("Every deployed card must belong to the current hand.")


def constraint_allows(card: Dict[str, Any], constraint_id: str) -> bool:
    level, trait = card["level"], card["trait"]
    return {
        "odd_only": level % 2 == 1,
        "even_only": level % 2 == 0,
        "max_level_3": level <= 3,
        "min_level_2": level >= 2,
        "no_trait_only": trait is None,
        "open_field": True,
    }.get(constraint_id, False)


def _resolve_traits(deployments: Dict[str, List[Dict[str, Any]]], effective: Dict[str, List[int]]) -> list:
    logs = []
    for side, other in (("player", "enemy"), ("enemy", "player")):
        cards, opponents = deployments[side], deployments[other]
        for lane, card in enumerate(cards):
            trait = card["trait"]
            if effective[side][lane] <= 0:
                continue
            if trait == "flank" and lane in (0, 2):
                effective[side][lane] += 1
                logs.append({"lane": lane, "side": side, "trait": "側翼突襲", "text": "側翼戰力 +1"})
            elif trait == "snare" and effective[other][lane] > 0:
                effective[other][lane] = max(0, effective[other][lane] - 1)
                logs.append({"lane": lane, "side": side, "trait": "牽制泥沼", "text": "對位敵軍戰力 -1"})
            elif trait == "wall" and opponents[lane]["level"] > 2:
                effective[side][lane] += 1
                logs.append({"lane": lane, "side": side, "trait": "不屈壁壘", "text": "逆境戰力 +1"})
            elif trait == "assassin" and lane == 1:
                effective[side][lane] += 1
                logs.append({"lane": lane, "side": side, "trait": "中路刺殺", "text": "中路戰力 +1"})
    return logs


def resolve_round(
    player_deployment: List[str], enemy_deployment: List[str], player_hand: List[Dict[str, Any]],
    enemy_hand: List[Dict[str, Any]], player_stance: Stance, enemy_stance: Stance,
    constraint_id: str, state: GameState,
) -> Dict[str, Any]:
    """Resolve phases 2–5 and return an auditable round record."""
    validate_deployment(player_deployment, player_hand)
    validate_deployment(enemy_deployment, enemy_hand)
    if player_stance not in ("ODD", "EVEN") or enemy_stance not in ("ODD", "EVEN"):
        raise ValueError("Stance must be ODD or EVEN.")
    if constraint_id not in LANE_CONSTRAINTS:
        raise ValueError("Unknown lane constraint.")
    deployments = {
        side: [next(card for card in hand if card["id"] == card_id) for card_id in ids]
        for side, ids, hand in (("player", player_deployment, player_hand), ("enemy", enemy_deployment, enemy_hand))
    }
    effective = {side: [card["level"] for card in cards] for side, cards in deployments.items()}
    violations = {"player": [False] * 3, "enemy": [False] * 3}
    for side in ("player", "enemy"):
        card = deployments[side][1]
        violations[side][1] = not constraint_allows(card, constraint_id)
        if violations[side][1]:
            effective[side][1] = 0
    trait_logs = _resolve_traits(deployments, effective)
    lanes = []
    for i, multiplier in enumerate(LANE_MULTIPLIERS):
        lanes.append({
            "lane_index": i, "multiplier": multiplier,
            "player_card": deployments["player"][i], "enemy_card": deployments["enemy"][i],
            "player_effective_level": effective["player"][i],
            "enemy_effective_level": effective["enemy"][i],
            "player_score": effective["player"][i] * multiplier,
            "enemy_score": effective["enemy"][i] * multiplier,
            "player_constraint_violated": violations["player"][i],
            "enemy_constraint_violated": violations["enemy"][i],
            "traits_triggered": [log for log in trait_logs if log["lane"] == i],
        })
    player_score = sum(lane["player_score"] for lane in lanes)
    enemy_score = sum(lane["enemy_score"] for lane in lanes)
    winner: Winner = "player" if player_score > enemy_score else "enemy" if enemy_score > player_score else "tie"
    hp_before = {"player": state.player_hp, "enemy": state.enemy_hp}
    atk_before = {"player": state.player_atk, "enemy": state.enemy_atk}
    action = "平手，雙方姿態皆不生效。"
    if winner != "tie":
        loser = "enemy" if winner == "player" else "player"
        stance = player_stance if winner == "player" else enemy_stance
        atk_attr = f"{winner}_atk"
        if stance == "ODD":
            setattr(state, atk_attr, getattr(state, atk_attr) + 1)
            action = f"{winner} 勝出並蓄力，ATK +1。"
        else:
            damage = getattr(state, atk_attr)
            setattr(state, f"{loser}_hp", max(0, getattr(state, f"{loser}_hp") - damage))
            setattr(state, atk_attr, INITIAL_ATK)
            action = f"{winner} 勝出並造成 {damage} 點傷害，ATK 重置為 1。"
    state.round_history.append({"round": state.round_number, "player_score": player_score, "enemy_score": enemy_score})
    game_winner: Optional[str] = None
    win_reason: Optional[str] = None
    if state.player_hp <= 0 or state.enemy_hp <= 0:
        if state.player_hp <= 0 and state.enemy_hp <= 0:
            game_winner, win_reason = "draw", "HP_DEPLETED"
        else:
            game_winner = "player" if state.enemy_hp <= 0 else "enemy"
            win_reason = "HP_DEPLETED"
    elif state.round_number >= MAX_ROUNDS:
        if state.player_hp != state.enemy_hp:
            game_winner = "player" if state.player_hp > state.enemy_hp else "enemy"
            win_reason = "ROUND_LIMIT_HP"
        elif player_score != enemy_score:
            game_winner = "player" if player_score > enemy_score else "enemy"
            win_reason = "ROUND_LIMIT_R5_SCORE"
        else:
            player_sum = sum(item["player_score"] for item in state.round_history)
            enemy_sum = sum(item["enemy_score"] for item in state.round_history)
            game_winner = "player" if player_sum > enemy_sum else "enemy" if enemy_sum > player_sum else "draw"
            win_reason = "ROUND_LIMIT_TOTAL_SCORE" if game_winner != "draw" else "DRAW"
    state.status = game_winner or "ongoing"
    return {
        "round_number": state.round_number, "constraint_id": constraint_id,
        "constraint_name": LANE_CONSTRAINTS[constraint_id]["name"], "lanes": lanes,
        "player_stance": player_stance, "enemy_stance": enemy_stance, "winner": winner,
        "player_total_score": player_score, "enemy_total_score": enemy_score,
        "player_hp_before": hp_before["player"], "enemy_hp_before": hp_before["enemy"],
        "player_hp_after": state.player_hp, "enemy_hp_after": state.enemy_hp,
        "player_atk_before": atk_before["player"], "enemy_atk_before": atk_before["enemy"],
        "player_atk_after": state.player_atk, "enemy_atk_after": state.enemy_atk,
        "winner_action_text": action, "game_over": game_winner is not None,
        "game_winner": game_winner, "win_reason": win_reason,
    }
