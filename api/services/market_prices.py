import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

try:
    from services.market_fallback import build_fallback_snapshot
except ModuleNotFoundError:
    from api.services.market_fallback import build_fallback_snapshot

logger = logging.getLogger("geoplataform.market")

DEFAULT_CACHE_TTL_SECONDS = 300
DEFAULT_TIMEOUT_SECONDS = 5.0
CACHE_KEY = "market:metals:live"


class TTLCache:
    """Simple thread-safe TTL cache for normalized market payloads."""

    def __init__(self):
        self._lock = threading.Lock()
        self._data: Dict[str, Dict[str, Any]] = {}

    def get_raw(self, key: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._data.get(key)

    def set(self, key: str, value: Dict[str, Any], ttl_seconds: int) -> None:
        now = time.time()
        with self._lock:
            self._data[key] = {
                "value": value,
                "fetched_at": now,
                "expires_at": now + float(ttl_seconds),
            }


cache = TTLCache()


def _iso_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
        return value if value > 0 else default
    except ValueError:
        logger.warning("Invalid %s=%r, using default=%s", name, raw, default)
        return default


def _get_env_float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
        return value if value > 0 else default
    except ValueError:
        logger.warning("Invalid %s=%r, using default=%s", name, raw, default)
        return default


def _normalize_as_of(value: Any) -> str:
    if not value:
        return _iso_now_utc()
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            return value
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, timezone.utc).isoformat().replace("+00:00", "Z")
    return _iso_now_utc()


def _coerce_price(value: Any, field_name: str) -> float:
    if isinstance(value, dict):
        for nested_key in ("value", "price", "usd_per_lb", "usd_per_oz"):
            if nested_key in value:
                value = value[nested_key]
                break

    if value is None:
        raise ValueError(f"Missing price field: {field_name}")

    price = round(float(value), 2)
    if price <= 0:
        raise ValueError(f"Invalid price field: {field_name}")
    return price


def _extract_price_value(container: Dict[str, Any], aliases: tuple[str, ...], field_name: str) -> float:
    for alias in aliases:
        if alias in container:
            return _coerce_price(container.get(alias), field_name)
    raise ValueError(f"Missing price aliases for {field_name}")


def _extract_prices(payload: Dict[str, Any]) -> Dict[str, float]:
    candidates = [
        payload,
        payload.get("prices") or {},
        payload.get("data") or {},
        (payload.get("data") or {}).get("prices") or {},
    ]

    last_error: Optional[Exception] = None
    for candidate in candidates:
        if not isinstance(candidate, dict) or not candidate:
            continue
        try:
            return {
                "copper_usd_per_lb": _extract_price_value(
                    candidate,
                    ("copper_usd_per_lb", "copper", "copper_per_lb"),
                    "copper_usd_per_lb",
                ),
                "gold_usd_per_oz": _extract_price_value(
                    candidate,
                    ("gold_usd_per_oz", "gold", "gold_per_oz"),
                    "gold_usd_per_oz",
                ),
                "silver_usd_per_oz": _extract_price_value(
                    candidate,
                    ("silver_usd_per_oz", "silver", "silver_per_oz"),
                    "silver_usd_per_oz",
                ),
            }
        except (TypeError, ValueError) as exc:
            last_error = exc

    if last_error:
        raise ValueError(f"Unable to normalize provider payload: {last_error}") from last_error
    raise ValueError("Unable to normalize provider payload: empty payload")


class MetalsAPIProvider:
    """Isolated provider helper so the upstream source can be swapped later."""

    source_name = "metals_api"

    def __init__(self, base_url: str, api_key: str, timeout_seconds: float):
        self.base_url = base_url.strip()
        self.api_key = api_key.strip()
        self.timeout_seconds = timeout_seconds

    def fetch(self) -> Dict[str, Any]:
        if not self.base_url:
            raise RuntimeError("METALS_API_BASE_URL is not configured")

        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            headers["X-API-Key"] = self.api_key

        response = httpx.get(
            self.base_url,
            headers=headers,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()

        return {
            "source": str(payload.get("source") or self.source_name),
            "mode": "live",
            "as_of": _normalize_as_of(
                payload.get("as_of")
                or payload.get("timestamp")
                or payload.get("last_updated")
            ),
            "prices": _extract_prices(payload),
            "is_fallback": False,
        }


def _build_provider() -> MetalsAPIProvider:
    return MetalsAPIProvider(
        base_url=os.getenv("METALS_API_BASE_URL", ""),
        api_key=os.getenv("METALS_API_KEY", ""),
        timeout_seconds=_get_env_float("MARKET_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS),
    )


def _cache_ttl_seconds() -> int:
    return _get_env_int("MARKET_CACHE_TTL_SECONDS", DEFAULT_CACHE_TTL_SECONDS)


def _cached_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    cached_payload = dict(payload)
    cached_payload["mode"] = "cache"
    return cached_payload


def get_live_metals_prices() -> Dict[str, Any]:
    """Return live market prices with fresh-cache preference and local fallback."""
    raw = cache.get_raw(CACHE_KEY)
    now_ts = time.time()

    if raw and raw.get("expires_at", 0) > now_ts and "value" in raw:
        return _cached_response(raw["value"])

    provider = _build_provider()

    try:
        normalized = provider.fetch()
        cache.set(CACHE_KEY, normalized, _cache_ttl_seconds())
        return normalized
    except Exception as exc:
        logger.warning("Metals provider unavailable, using fallback snapshot: %s", exc)
        return build_fallback_snapshot()
