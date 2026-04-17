from datetime import datetime, timezone
from typing import Any, Dict, Optional

FALLBACK_SOURCE = "local_snapshot"
FALLBACK_PRICES = {
    "copper_usd_per_lb": 6.07,
    "gold_usd_per_oz": 4835.63,
    "silver_usd_per_oz": 79.21,
}


def _iso_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_fallback_snapshot(as_of: Optional[str] = None) -> Dict[str, Any]:
    """Return a normalized local fallback snapshot for metals prices."""
    return {
        "source": FALLBACK_SOURCE,
        "mode": "fallback",
        "as_of": as_of or _iso_now_utc(),
        "prices": dict(FALLBACK_PRICES),
        "is_fallback": True,
    }
