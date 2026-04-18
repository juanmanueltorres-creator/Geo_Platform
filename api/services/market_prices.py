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


def _normalize_metalpriceapi_url(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")
    if not normalized:
        return DEFAULT_METALS_API_BASE_URL
    if normalized.endswith("/latest"):
        return normalized
    if normalized.endswith("/v1"):
        return f"{normalized}/latest"
    return normalized


def _mask_params(params: Dict[str, Any]) -> Dict[str, Any]:
    masked = dict(params)
    if "api_key" in masked:
        masked["api_key"] = "***"
    return masked


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


def _coerce_positive_number(value: Any, field_name: str) -> float:
    if value is None:
        raise ValueError(f"Missing price field: {field_name}")

    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid price field: {field_name}") from exc

    if parsed <= 0:
        raise ValueError(f"Invalid price field: {field_name}")
    return parsed


def _parse_usd_base_rate_to_usd_per_unit(value: Any, field_name: str) -> float:
    rate = _coerce_positive_number(value, field_name)
    price = round(1.0 / rate, 2)
    if price <= 0:
        raise ValueError(f"Invalid price field: {field_name}")
    return price


def _get_rates(payload: Dict[str, Any]) -> Dict[str, Any]:
    if payload.get("success") is not True:
        logger.warning("metalpriceapi full response: %s", payload)
        raise ValueError("metalpriceapi returned success=false")

    rates = payload.get("rates")
    if not isinstance(rates, dict):
        raise ValueError("metalpriceapi response is missing rates")

    logger.info(
        "metalpriceapi success response: base=%s rates=%s",
        payload.get("base"),
        {key: rates.get(key) for key in ("XAU", "XAG")},
    )

    return rates


def _extract_partial_live_prices(payload: Dict[str, Any]) -> Dict[str, Any]:
    rates = _get_rates(payload)
    gold_price = _parse_usd_base_rate_to_usd_per_unit(rates.get("XAU"), "XAU")
    silver_price = _parse_usd_base_rate_to_usd_per_unit(rates.get("XAG"), "XAG")

    logger.info(
        "Parsed market rates successfully: xau_ok=%s xag_ok=%s gold_usd_per_oz=%s silver_usd_per_oz=%s",
        gold_price > 0,
        silver_price > 0,
        gold_price,
        silver_price,
    )

    fallback_snapshot = build_fallback_snapshot()

    return {
        "source": "metalpriceapi+local_snapshot",
        "mode": "partial_live",
        "as_of": _iso_now_utc(),
        "prices": {
            "copper_usd_per_lb": fallback_snapshot["prices"]["copper_usd_per_lb"],
            "gold_usd_per_oz": gold_price,
            "silver_usd_per_oz": silver_price,
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
        self.base_url = _normalize_metalpriceapi_url(base_url)
        self.api_key = api_key.strip()
        self.timeout_seconds = timeout_seconds

    def fetch(self) -> Dict[str, Any]:
        if not self.base_url:
            raise RuntimeError("METALS_API_BASE_URL is not configured")

        params = {
            "api_key": self.api_key,
            "base": "USD",
            "currencies": "XAU,XAG",
        }

        logger.info(
            "Market provider request starting: api_key_present=%s base_url=%s params=%s",
            bool(self.api_key),
            self.base_url,
            _mask_params(params),
        )

        response = httpx.get(
            self.base_url,
            params=params,
            headers={"Accept": "application/json"},
            timeout=self.timeout_seconds,
        )
        logger.info("Market provider response status: %s", response.status_code)
        if not response.is_success:
            logger.warning(
                "Market provider non-success response body: %s",
                response.text,
            )
        response.raise_for_status()
        payload = response.json()
        normalized = _extract_partial_live_prices(payload)
        logger.info("Market provider returning mode=%s", normalized.get("mode"))
        return normalized


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
        logger.info("Market service returning mode=cache")
        return _cached_response(raw["value"])

    provider = _build_provider()

    try:
        normalized = provider.fetch()
        cache.set(CACHE_KEY, normalized, _cache_ttl_seconds())
        logger.info("Market service returning mode=%s", normalized.get("mode"))
        return normalized
    except Exception as exc:
        logger.warning("Metals provider unavailable, using fallback snapshot: %s", exc)
        logger.info("Market service returning mode=fallback")
        return build_fallback_snapshot()
