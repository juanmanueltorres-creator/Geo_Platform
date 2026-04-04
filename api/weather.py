import time
import threading
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
import logging
import httpx
from fastapi import HTTPException

logger = logging.getLogger("geoplataform.weather")

# Project-specific constants (Filo del Sol)
PROJECT_NAME = "Filo del Sol"
# Coordinates taken from repository sources (scripts / geology data)
LATITUDE = -28.49
LONGITUDE = -69.66
TTL_SECONDS = 600  # 10 minutes


class TTLCache:
    """Simple thread-safe TTL in-memory cache.

    Stores entries as dicts: {value, fetched_at, expires_at}
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._data: Dict[str, Dict[str, Any]] = {}

    def get_raw(self, key: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._data.get(key)

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            if entry["expires_at"] < time.time():
                # expired
                return None
            return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: int):
        now = time.time()
        with self._lock:
            self._data[key] = {
                "value": value,
                "fetched_at": now,
                "expires_at": now + float(ttl_seconds),
            }

    def clear(self, key: Optional[str] = None):
        with self._lock:
            if key is None:
                self._data.clear()
            else:
                self._data.pop(key, None)


# single global cache instance for simplicity
cache = TTLCache()


def _iso_now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def fetch_open_meteo_current() -> Dict[str, Any]:
    """Fetch current weather and minimal hourly/daily fields from Open-Meteo

    Returns a normalized dict (not cached).
    """
    base = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "current_weather": "true",
        # hourly fields we need for humidity/precip/cloud/gusts
        "hourly": "relativehumidity_2m,precipitation,cloudcover,windgusts_10m",
        "daily": "sunrise,sunset",
        # timezone=auto returns times localized to the location
        "timezone": "auto",
        # enforce units
        "temperature_unit": "celsius",
        "windspeed_unit": "ms",
    }

    try:
        resp = httpx.get(base, params=params, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"Open-Meteo fetch failed: {e}")
        raise

    cw = data.get("current_weather", {})
    hourly = data.get("hourly", {})
    daily = data.get("daily", {})

    time_values = hourly.get("time", [])
    cw_time = cw.get("time")

    idx = None
    if cw_time and time_values:
        try:
            idx = time_values.index(cw_time)
        except ValueError:
            idx = None

    def _hourly_val(name: str):
        arr = hourly.get(name, [])
        if idx is not None and idx < len(arr):
            return arr[idx]
        return None

    temperature_c = cw.get("temperature")
    wind_speed_ms = cw.get("windspeed")
    wind_direction_deg = cw.get("winddirection")

    wind_gust_ms = _hourly_val("windgusts_10m")
    humidity_percent = _hourly_val("relativehumidity_2m")
    precipitation_mm = _hourly_val("precipitation")
    cloud_cover_percent = _hourly_val("cloudcover")

    # daily sunrise/sunset: align by date if possible
    sunrise = None
    sunset = None
    try:
        daily_dates = daily.get("time", [])
        if cw_time and daily_dates:
            # derive date string from cw_time (ISO)
            from datetime import datetime

            dt = datetime.fromisoformat(cw_time)
            date_str = dt.date().isoformat()
            if date_str in daily_dates:
                d_idx = daily_dates.index(date_str)
                sr = daily.get("sunrise", [])
                ss = daily.get("sunset", [])
                if d_idx < len(sr):
                    sunrise = sr[d_idx]
                if d_idx < len(ss):
                    sunset = ss[d_idx]
    except Exception:
        # non-fatal parsing issue — leave sunrise/sunset as None
        pass

    fetched_at = _iso_now_utc()
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=TTL_SECONDS)).isoformat()

    normalized = {
        "project": PROJECT_NAME,
        "coordinates": {"lat": LATITUDE, "lon": LONGITUDE},
        "source": {"provider": "open-meteo", "api_url": base},
        "fetched_at": fetched_at,
        "expires_at": expires_at,
        "ttl_seconds": TTL_SECONDS,
        "current": {
            "time": cw_time,
            "temperature_c": temperature_c,
            "wind_speed_ms": wind_speed_ms,
            "wind_gust_ms": wind_gust_ms,
            "wind_direction_deg": wind_direction_deg,
            "precipitation_mm": precipitation_mm,
            "cloud_cover_percent": cloud_cover_percent,
            "humidity_percent": humidity_percent,
            "sunrise": sunrise,
            "sunset": sunset,
        },
    }

    return normalized


def get_current_weather(force_refresh: bool = False) -> Dict[str, Any]:
    """Return cached current weather for the project, fetching from provider when needed.

    Behavior:
    - If cached and not expired -> return cached
    - If expired or missing -> attempt fetch; on success update cache and return
    - On fetch failure: if stale cache exists, return it with `_stale`: True, otherwise raise
    """
    key = "project:filo_del_sol:current"
    raw = cache.get_raw(key)
    now_ts = time.time()

    # If cached and still valid, return immediately (avoid calling upstream)
    if not force_refresh and raw and raw.get("expires_at", 0) > now_ts:
        return raw["value"]

    # Attempt to refresh from provider
    try:
        normalized = fetch_open_meteo_current()
        cache.set(key, normalized, TTL_SECONDS)
        return normalized

    except httpx.HTTPStatusError as http_err:
        status = None
        try:
            status = http_err.response.status_code if http_err.response is not None else None
        except Exception:
            status = None

        logger.warning(f"Open-Meteo HTTP error: status={status}")

        # Rate limited by provider — prefer stale cache if available
        if status == 429:
            if raw and "value" in raw:
                stale = raw["value"].copy()
                stale["stale"] = True
                stale["source_status"] = "rate_limited"
                return stale
            # No cache available — return controlled 503
            raise HTTPException(status_code=503, detail={
                "error": "weather_unavailable",
                "message": "Weather provider rate-limited",
                "source_status": "rate_limited"
            })

        # Other upstream HTTP errors
        if raw and "value" in raw:
            stale = raw["value"].copy()
            stale["stale"] = True
            stale["source_status"] = f"upstream_error_{status}"
            return stale
        raise HTTPException(status_code=503, detail={
            "error": "weather_unavailable",
            "message": "Upstream weather provider error",
            "source_status": f"upstream_error_{status}"
        })

    except Exception as e:
        logger.warning(f"Open-Meteo fetch failed: {e}")
        # Network or unexpected errors — prefer stale cache if available
        if raw and "value" in raw:
            stale = raw["value"].copy()
            stale["stale"] = True
            stale["source_status"] = "unavailable"
            return stale
        raise HTTPException(status_code=503, detail={
            "error": "weather_unavailable",
            "message": "Weather provider unavailable",
            "source_status": "unavailable"
        })


def clear_cache():
    cache.clear()


def cache_info() -> Dict[str, Any]:
    raw = cache.get_raw("project:filo_del_sol:current")
    if not raw:
        return {"present": False}
    return {
        "present": True,
        "fetched_at": datetime.fromtimestamp(raw["fetched_at"], timezone.utc).isoformat(),
        "expires_at": datetime.fromtimestamp(raw["expires_at"], timezone.utc).isoformat(),
    }
