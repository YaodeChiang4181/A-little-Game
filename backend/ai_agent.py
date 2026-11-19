"""Small, rules-aware AI for the three-card hand and middle-lane order."""

import itertools
import random
from typing import Dict, List, Tuple

from engine import Stance, constraint_allows


def _projected_score(deployment: List[Dict], constraint_id: str) -> int:
    score = 0
    for lane, card in enumerate(deployment):
        effective = card["level"]
        if lane == 1 and not constraint_allows(card, constraint_id):
            continue
        if card["trait"] == "flank" and lane in (0, 2):
            effective += 1
        elif card["trait"] == "assassin" and lane == 1:
            effective += 1
        score += effective * (2 if lane == 1 else 1)
    return score


def choose_ai_decision(
    hand: List[Dict], constraint_id: str, round_number: int,
    ai_hp: int, player_hp: int, ai_atk: int, player_atk: int,
    rng: random.Random = random,
) -> Tuple[List[str], Stance]:
    """Evaluate all six placements and select a stance using documented heuristics."""
    placements = list(itertools.permutations(hand, 3))
    ranked = sorted(placements, key=lambda cards: _projected_score(list(cards), constraint_id), reverse=True)
    best_deployment = list(ranked[0])
    # Add controlled noise while retaining strong constraint-aware placement.
    if len(ranked) > 1 and rng.random() < 0.2:
        best_deployment = list(ranked[1])
    if ai_atk >= player_hp:
        stance: Stance = "EVEN" if rng.random() < 0.85 else "ODD"
    elif player_atk >= ai_hp:
        stance = "EVEN" if rng.random() < 0.65 else "ODD"
    elif ai_atk == 1:
        stance = "ODD" if rng.random() < (0.75 if round_number <= 2 else 0.5) else "EVEN"
    else:
        stance = "EVEN" if rng.random() < 0.7 else "ODD"
    return [card["id"] for card in best_deployment], stance


def choose_best_deployment(hand: List[Dict], constraint_id: str = "open_field") -> List[str]:
    """Compatibility helper returning the highest projected-score placement."""
    return [card["id"] for card in max(itertools.permutations(hand, 3),
                                       key=lambda cards: _projected_score(list(cards), constraint_id))]
