"""Game logic helpers for LEGO Guessr."""

from __future__ import annotations

import random
from typing import Any


def _clamp_range(
    value: int,
    span: int,
    minimum: int | None = None,
    maximum: int | None = None,
) -> tuple[int, int]:
    half = max(1, span // 2)
    low = value - random.randint(0, half)
    high = value + random.randint(0, max(1, span - (value - low)))
    if low == high:
        high = low + 1
    if minimum is not None:
        low = max(minimum, low)
    if maximum is not None:
        high = min(maximum, high)
    if low > value:
        low = value
    if high < value:
        high = value
    if low == high:
        high = low + 1
    return low, high


def make_clues(set_data: dict[str, Any]) -> dict[str, Any]:
    year = int(set_data.get("year") or 2000)
    parts = int(set_data.get("num_parts") or 0)
    figs = int(set_data.get("num_minifigs") or 0)

    year_span = random.choice([4, 6, 8, 10])
    parts_span = max(50, int(parts * random.uniform(0.25, 0.55)) or 50)
    figs_span = max(2, figs + random.randint(1, 4)) if figs else 2

    y_low, y_high = _clamp_range(year, year_span, 1949, 2030)
    p_low, p_high = _clamp_range(parts, parts_span, 0, None)
    if figs == 0:
        f_low, f_high = 0, random.randint(0, 2)
    else:
        f_low, f_high = _clamp_range(figs, figs_span, 0, None)

    return {
        "year_range": [y_low, y_high],
        "parts_range": [p_low, p_high],
        "minifigs_range": [f_low, f_high],
    }


def pick_choices(
    answer: dict[str, Any], pool: list[dict[str, Any]], count: int = 6
) -> list[dict[str, Any]]:
    """Guess mode: unique sets only, equal weight (ignore quantity)."""
    others = [s for s in pool if s["set_num"] != answer["set_num"]]
    sample_size = min(count - 1, len(others))
    picks = random.sample(others, sample_size) if sample_size else []
    choices = picks + [answer]
    random.shuffle(choices)
    return [
        {
            "set_num": s["set_num"],
            "name": s.get("name"),
            "set_img_url": s.get("set_img_url"),
            "year": s.get("year"),
            "num_parts": s.get("num_parts"),
            "num_minifigs": s.get("num_minifigs"),
        }
        for s in choices
    ]


def _weight(set_data: dict[str, Any]) -> int:
    try:
        return max(1, int(set_data.get("quantity") or 1))
    except (TypeError, ValueError):
        return 1


def weighted_choices(
    pool: list[dict[str, Any]], k: int, *, allow_duplicates: bool = True
) -> list[dict[str, Any]]:
    """
    Tirage pondéré par quantité.
    Ex. qty=2 parmi 50 exemplaires totaux → proba 2/50.
    Si allow_duplicates=True, le même set peut sortir plusieurs fois.
    """
    if not pool or k <= 0:
        return []
    weights = [_weight(s) for s in pool]
    if allow_duplicates:
        return list(random.choices(pool, weights=weights, k=k))

    remaining = list(pool)
    remaining_w = list(weights)
    picks: list[dict[str, Any]] = []
    for _ in range(min(k, len(remaining))):
        chosen = random.choices(remaining, weights=remaining_w, k=1)[0]
        picks.append(chosen)
        idx = remaining.index(chosen)
        remaining.pop(idx)
        remaining_w.pop(idx)
    return picks


def public_set(set_data: dict[str, Any], hide_identity: bool = False) -> dict[str, Any]:
    if hide_identity:
        return {
            "set_num": set_data["set_num"],
            "clues_only": True,
        }
    return {
        "set_num": set_data["set_num"],
        "name": set_data.get("name"),
        "year": set_data.get("year"),
        "num_parts": set_data.get("num_parts"),
        "num_minifigs": set_data.get("num_minifigs"),
        "set_img_url": set_data.get("set_img_url"),
        "set_url": set_data.get("set_url"),
        "quantity": set_data.get("quantity", 1),
    }
