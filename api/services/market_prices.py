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
DEFAULT_METALS_API_BASE_URL = "https://api.metalpriceapi.com/v1/latest"
CACHE_KEY = "market:metals:live"
POUNDS_PER_METRIC_TONNE = 2204.62


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


def _coerce_price(value: Any, field_name: str) -> float:
    if value is None:
        raise ValueError(f"Missing price field: {field_name}")

    price = round(float(value), 2)
    if price <= 0:
        raise ValueError(f"Invalid price field: {field_name}")
    return price


def _convert_metric_ton_to_pounds_price(value: Any) -> float:
    usd_per_metric_ton = float(value)
    if usd_per_metric_ton <= 0:
        raise ValueError("Invalid price field: XCU")
    return round(usd_per_metric_ton / POUNDS_PER_METRIC_TONNE, 2)


def _get_rates(payload: Dict[str, Any]) -> Dict[str, Any]:
    if payload.get("success") is not True:
        raise ValueError("metalpriceapi returned success=false")

    rates = payload.get("rates")
    if not isinstance(rates, dict):
        raise ValueError("metalpriceapi response is missing rates")

    return rates


def _is_paid_plan_restriction(value: Any) -> bool:
    return isinstance(value, str) and "paid plan" in value.lower()


def _extract_metalpriceapi_prices(payload: Dict[str, Any]) -> Dict[str, float]:
    rates = _get_rates(payload)

    return {
        "copper_usd_per_lb": _convert_metric_ton_to_pounds_price(rates.get("XCU")),
        "gold_usd_per_oz": _coerce_price(rates.get("XAU"), "XAU"),
        "silver_usd_per_oz": _coerce_price(rates.get("XAG"), "XAG"),
    }


def _extract_partial_live_prices(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    rates = _get_rates(payload)
    xcu_value = rates.get("XCU")

    if not _is_paid_plan_restriction(xcu_value):
        return None

    fallback_snapshot = build_fallback_snapshot()

    return {
        "source": "metalpriceapi+local_snapshot",
        "mode": "partial_live",
        "as_of": _iso_now_utc(),
        "prices": {
            "copper_usd_per_lb": fallback_snapshot["prices"]["copper_usd_per_lb"],
            "gold_usd_per_oz": _coerce_price(rates.get("XAU"), "XAU"),
            "silver_usd_per_oz": _coerce_price(rates.get("XAG"), "XAG"),
        },
        "is_fallback": False,
        "partial_fallback": {
            "fields": ["copper_usd_per_lb"],
            "source": "local_snapshot",
        },
    }


class MetalsAPIProvider:
    """Isolated provider helper so the upstream source can be swapped later."""

    source_name = "metalpriceapi"

    def __init__(self, base_url: str, api_key: str, timeout_seconds: float):
        self.base_url = base_url.strip()
        self.api_key = api_key.strip()
        self.timeout_seconds = timeout_seconds

    def fetch(self) -> Dict[str, Any]:
        if not self.base_url:
            raise RuntimeError("METALS_API_BASE_URL is not configured")

        response = httpx.get(
            self.base_url,
            params={
                "api_key": self.api_key,
                "base": "USD",
                "currencies": "XAU,XAG,XCU",
            },
            headers={"Accept": "application/json"},
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        partial_live = _extract_partial_live_prices(payload)

        if partial_live:
            return partial_live

        return {
            "source": self.source_name,
            "mode": "live",
            "as_of": _iso_now_utc(),
            "prices": _extract_metalpriceapi_prices(payload),
            "is_fallback": False,
        }


def _build_provider() -> MetalsAPIProvider:
    return MetalsAPIProvider(
        base_url=os.getenv("METALS_API_BASE_URL", "").strip() or DEFAULT_METALS_API_BASE_URL,
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
