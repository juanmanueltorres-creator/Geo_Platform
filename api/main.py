from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware

import psycopg2
import psycopg2.extras
from psycopg2 import pool
import json
import os
import random
import secrets
import time
import logging
from dotenv import load_dotenv

# =============================
# LOGGING SETUP
# =============================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("geoplataform")

# =============================
# LOAD ENV
# =============================

load_dotenv()

# =============================
# APP INIT
# =============================

app = FastAPI(
    title="GeoPlatform Exploration API",
    description="Production-grade API for geological exploration data",
    version="2.0"
)

# =============================
# CORS
# =============================

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^http://localhost.*",
    allow_origins=[
        "https://geo-plataform.onrender.com",
        "https://geo-platform-cyan.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# CONNECTION POOLING
# =============================

db_pool = None

def init_pool():
    """Initialize connection pool with retries and exponential backoff.

    Does NOT raise on final failure — leaves db_pool as None so the app
    keeps running and individual endpoints return 503 as needed.
    """
    global db_pool
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        logger.error(
            "DATABASE_URL is not set — skipping pool initialization. "
            "Set DATABASE_URL in your environment or api/.env file."
        )
        return  # db_pool stays None; endpoints will return 503
    retries = int(os.getenv("DB_CONN_RETRIES", "3"))
    backoff = float(os.getenv("DB_CONN_RETRY_BACKOFF", "2.0"))
    minconn = int(os.getenv("DB_POOL_MIN", "1"))
    maxconn = int(os.getenv("DB_POOL_MAX", "10"))
    connect_timeout = int(os.getenv("DB_CONNECT_TIMEOUT", "5"))

    for attempt in range(1, retries + 1):
        try:
            db_pool = pool.SimpleConnectionPool(
                minconn=minconn,
                maxconn=maxconn,
                dsn=dsn,
                connect_timeout=connect_timeout,
            )
            logger.info("Connection pool initialized successfully")
            return
        except Exception as e:
            db_pool = None
            logger.warning(f"init_pool attempt {attempt}/{retries} failed: {e}")
            if attempt == retries:
                logger.error(
                    "All init_pool attempts exhausted — "
                    "app will keep running; DB endpoints will return 503"
                )
                return
            sleep = backoff * (2 ** (attempt - 1)) * (0.5 + random.random() * 0.5)
            logger.info(f"Retrying in {sleep:.1f}s...")
            time.sleep(sleep)


def get_connection():
    """Get connection from pool.

    If db_pool is None (startup failed), tries to reinitialize once.
    Raises HTTP 503 if the DB is still unavailable.
    """
    global db_pool
    if db_pool is None:
        logger.info("db_pool is None — attempting lazy reinitialization")
        init_pool()

    if db_pool is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        return db_pool.getconn()
    except Exception as e:
        logger.warning(f"getconn error: {e} — attempting one pool reinit")
        db_pool = None
        init_pool()
        if db_pool is None:
            raise HTTPException(status_code=503, detail="Database unavailable")
        try:
            return db_pool.getconn()
        except Exception as e2:
            logger.error(f"getconn after reinit failed: {e2}")
            raise HTTPException(status_code=503, detail="Database unavailable")


@app.on_event("startup")
def startup():
    """Initialize pool on startup — failures are non-fatal."""
    init_pool()

@app.on_event("shutdown")
def shutdown():
    """Close all connections on shutdown"""
    global db_pool
    try:
        if db_pool:
            db_pool.closeall()
            logger.info("Connection pool closed")
    except Exception as e:
        logger.error(f"Shutdown error: {e}")
# =============================
# ROOT ENDPOINT
# =============================

@app.get("/")
def root():
    """API overview with available endpoints"""
    return {
        "status": "running",
        "title": "GeoPlatform Exploration API v2.0",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "drillholes": "/drillholes (?project_id=, ?limit=, ?offset=)",
            "drillhole_summary": "/drillholes/{id}/summary",
            "drillhole_assays": "/drillholes/{id}/assays (?element=)",
            "drillhole_lithology": "/drillholes/{id}/lithology (?from_depth=, ?to_depth=)",
            "drillhole_alteration": "/drillholes/{id}/alteration",
            "drillhole_geology_summary": "/drillholes/{id}/geology-summary",
            "geospatial_locations": "/geospatial/drillhole-locations",
            "geospatial_domains": "/geospatial/domains (?type=)",
            "geospatial_geojson": "/geospatial/drillholes-geojson"
        }
    }

# =============================
# HEALTH CHECK
# =============================

@app.get("/health")
def health():
    """Server health check"""
    return {"status": "ok", "version": "2.0"}


# =============================
# READINESS CHECK
# =============================

@app.get("/ready")
def ready():
    """Readiness probe — confirms DB is reachable.

    Returns 200 if a lightweight SELECT 1 succeeds.
    Returns 503 if the DB is unreachable.
    Use this as the readiness probe in k8s / platform health checks.
    """
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        return {"status": "ready"}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Database not ready")
    finally:
        if conn and db_pool:
            db_pool.putconn(conn)

# =============================
# DRILLHOLES LIST (with pagination & filtering)
# =============================

@app.get("/drillholes")
def list_drillholes(
    project_id: str = Query(None, description="Filter by project UUID"),
    limit: int = Query(50, ge=1, le=500, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    sort: str = Query("hole_id", description="Sort field (hole_id, depth_max)")
):
    """
    List drillholes with pagination and filtering.
    
    **Parameters:**
    - `project_id`: Filter by project (optional)
    - `limit`: Rows per page (1-500, default 50)
    - `offset`: Pagination offset (default 0)
    - `sort`: Sort by hole_id or depth_max
    """
    
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Build base query
        base_query = """
            SELECT 
                hole_id,
                project_id,
                total_depth
            FROM drillholes
            WHERE 1=1
        """
        
        params = []
        
        if project_id:
            base_query += " AND project_id = %s"
            params.append(project_id)
        
        # Validate sort field
        valid_sorts = {"hole_id", "total_depth"}
        sort_field = sort if sort in valid_sorts else "hole_id"
        base_query += f" ORDER BY {sort_field}"
        
        # Add pagination
        base_query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cur.execute(base_query, params)
        rows = cur.fetchall()
        
        logger.info(f"Listed {len(rows)} drillholes (offset={offset}, limit={limit})")
        
        return {
            "total_returned": len(rows),
            "limit": limit,
            "offset": offset,
            "data": [
                {
                    "hole_id": r["hole_id"],
                    "name": r["hole_id"],
                    "project_id": r["project_id"],
                    "max_depth": float(r["total_depth"]) if r["total_depth"] is not None else None
                }
                for r in rows
            ]
        }

    except Exception as e:
        logger.error(f"Error fetching drillholes: {e}")
        raise HTTPException(status_code=500, detail="Error fetching drillholes")

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# HELPERS
# =============================

def _resolve_drillhole_uuid(cur, drillhole_id: str) -> str:
    """Resolve a path param that may be a UUID or a human-readable hole_id.

    Returns the internal UUID string, or raises HTTP 404 if not found.
    """
    import uuid as _uuid
    try:
        _uuid.UUID(drillhole_id)
        return drillhole_id  # already a valid UUID
    except ValueError:
        pass

    cur.execute("SELECT id FROM drillholes WHERE hole_id = %s", [drillhole_id])
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Drillhole '{drillhole_id}' not found")
    return str(row["id"])


# =============================
# DRILLHOLE ASSAYS (multi-element)
# =============================

@app.get("/drillholes/{drillhole_id}/assays")
def get_assays(
    drillhole_id: str,
    element: str = Query(None, description="Filter by element (Au, Cu, Ag, etc)"),
    from_depth: float = Query(None, ge=0, description="Minimum depth"),
    to_depth: float = Query(None, ge=0, description="Maximum depth")
):
    """
    Get multi-element geochemistry for a drillhole.
    
    **Parameters:**
    - `element`: Filter by specific element (Au, Cu, Ag, Mo, etc)
    - `from_depth`: Minimum depth interval (meters)
    - `to_depth`: Maximum depth interval (meters)
    """
    
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        drillhole_uuid = _resolve_drillhole_uuid(cur, drillhole_id)

        base_query = """
            SELECT 
                s.id AS sample_id,
                lower(s.interval) AS from_depth,
                upper(s.interval) AS to_depth,
                COALESCE(e.symbol, 'Unknown') AS element,
                ar.value,
                ar.unit,
                ar.is_below_detection
            FROM samples s
            JOIN assay_results ar ON s.id = ar.sample_id
            LEFT JOIN elements e ON ar.element_id = e.id
            WHERE s.drillhole_id = %s
        """
        
        params = [drillhole_uuid]
        
        if element:
            base_query += " AND UPPER(COALESCE(e.symbol, '')) = UPPER(%s)"
            params.append(element)
        
        if from_depth is not None:
            base_query += " AND upper(s.interval) >= %s"
            params.append(from_depth)
        
        if to_depth is not None:
            base_query += " AND lower(s.interval) <= %s"
            params.append(to_depth)
        
        base_query += " ORDER BY from_depth, e.symbol"
        
        cur.execute(base_query, params)
        rows = cur.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"No assays found for drillhole {drillhole_id}"
            )

        logger.info(f"Fetched {len(rows)} assay rows for {drillhole_id}")
        
        return {
            "drillhole_id": drillhole_id,
            "assay_count": len(rows),
            "filters": {
                "element": element,
                "from_depth": from_depth,
                "to_depth": to_depth
            },
            "data": [
                {
                    "sample_id": str(r["sample_id"]),
                    "from": float(r["from_depth"]),
                    "to": float(r["to_depth"]),
                    "interval_length": round(float(r["to_depth"]) - float(r["from_depth"]), 2),
                    "element": r["element"],
                    "value": float(r["value"]),
                    "unit": r["unit"],
                    "below_detection": r["is_below_detection"]
                }
                for r in rows
            ]
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error fetching assays for {drillhole_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching assay data"
        )

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# DRILLHOLE SUMMARY (Au stats)
# =============================

@app.get("/drillholes/{drillhole_id}/summary")
def get_drillhole_summary(drillhole_id: str):
    """
    Get summary statistics for a drillhole.
    
    Returns:
    - `total_samples`: Count of samples in drillhole
    - `avg_au`: Average gold (Au) value across all samples
    - `max_au`: Maximum gold (Au) value observed
    """
    
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        drillhole_uuid = _resolve_drillhole_uuid(cur, drillhole_id)

        # Query to get summary stats on Au
        summary_query = """
            SELECT 
                COUNT(DISTINCT s.id) AS total_samples,
                AVG(CASE WHEN UPPER(e.symbol) = 'AU' THEN ar.value ELSE NULL END) AS avg_au,
                MAX(CASE WHEN UPPER(e.symbol) = 'AU' THEN ar.value ELSE NULL END) AS max_au
            FROM samples s
            LEFT JOIN assay_results ar ON s.id = ar.sample_id
            LEFT JOIN elements e ON ar.element_id = e.id
            WHERE s.drillhole_id = %s
        """
        
        cur.execute(summary_query, [drillhole_uuid])
        result = cur.fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Drillhole {drillhole_id} not found"
            )

        total_samples = result["total_samples"] or 0
        avg_au = float(result["avg_au"]) if result["avg_au"] else None
        max_au = float(result["max_au"]) if result["max_au"] else None

        logger.info(f"Summary for {drillhole_id}: {total_samples} samples, avg_au={avg_au}, max_au={max_au}")
        
        return {
            "drillhole_id": drillhole_id,
            "total_samples": total_samples,
            "avg_au": avg_au,
            "max_au": max_au
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error fetching summary for {drillhole_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching drillhole summary"
        )

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# DRILLHOLE LITHOLOGY
# =============================

@app.get("/drillholes/{drillhole_id}/lithology")
def get_lithology(
    drillhole_id: str,
    from_depth: float = Query(None, ge=0, description="Minimum depth"),
    to_depth: float = Query(None, ge=0, description="Maximum depth")
):
    """
    Get lithological classification by depth interval.
    
    **Parameters:**
    - `from_depth`: Minimum depth (meters)
    - `to_depth`: Maximum depth (meters)
    """
    
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        base_query = """
            SELECT 
                s.id AS sample_id,
                lower(s.interval) AS from_depth,
                upper(s.interval) AS to_depth,
                COALESCE(l.lithology_code, 'Unknown') AS lithology_code,
                COALESCE(l.lithology_description, 'Not classified') AS lithology_description
            FROM samples s
            LEFT JOIN lithology_intervals l ON s.id = l.sample_id
            WHERE s.drillhole_id = %s
        """
        
        params = [drillhole_id]
        
        if from_depth is not None:
            base_query += " AND upper(s.interval) >= %s"
            params.append(from_depth)
        
        if to_depth is not None:
            base_query += " AND lower(s.interval) <= %s"
            params.append(to_depth)
        
        base_query += " ORDER BY from_depth"
        
        cur.execute(base_query, params)
        rows = cur.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"No lithology data found for {drillhole_id}"
            )

        logger.info(f"Fetched {len(rows)} lithology intervals for {drillhole_id}")
        
        return {
            "drillhole_id": drillhole_id,
            "interval_count": len(rows),
            "data": [
                {
                    "sample_id": r["sample_id"],
                    "from": float(r["from_depth"]),
                    "to": float(r["to_depth"]),
                    "interval_length": round(float(r["to_depth"]) - float(r["from_depth"]), 2),
                    "lithology_code": r["lithology_code"],
                    "lithology": r["lithology_description"]
                }
                for r in rows
            ]
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error fetching lithology for {drillhole_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching lithology data"
        )

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# DRILLHOLE ALTERATION
# =============================

@app.get("/drillholes/{drillhole_id}/alteration")
def get_alteration(drillhole_id: str):
    """
    Get alteration zonation for a drillhole.

    Returns intervals with alteration type, intensity, and depth range,
    ordered from surface to depth.
    """
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        drillhole_uuid = _resolve_drillhole_uuid(cur, drillhole_id)

        cur.execute("""
            SELECT
                at.code,
                at.name,
                ae.intensity,
                lower(ae.interval)::int AS from_depth,
                upper(ae.interval)::int AS to_depth
            FROM alteration_events ae
            JOIN alteration_types at ON at.id = ae.alteration_id
            WHERE ae.drillhole_id = %s
            ORDER BY lower(ae.interval)
        """, [drillhole_uuid])

        rows = cur.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"No alteration data for {drillhole_id}"
            )

        logger.info(f"Fetched {len(rows)} alteration intervals for {drillhole_id}")

        return {
            "drillhole_id": drillhole_id,
            "interval_count": len(rows),
            "data": [
                {
                    "code": r["code"],
                    "name": r["name"],
                    "intensity": r["intensity"],
                    "from": r["from_depth"],
                    "to": r["to_depth"],
                }
                for r in rows
            ]
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error fetching alteration for {drillhole_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching alteration data"
        )

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# DRILLHOLE GEOLOGY SUMMARY
# =============================

@app.get("/drillholes/{drillhole_id}/geology-summary")
def get_geology_summary(drillhole_id: str):
    """
    Compact geological summary for a drillhole: dominant lithology,
    lithology sequence, dominant alteration, alteration sequence,
    and a short interpretation.
    """
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        drillhole_uuid = _resolve_drillhole_uuid(cur, drillhole_id)

        # Lithology: ordered intervals
        cur.execute("""
            SELECT l.code, l.name,
                   (upper(li.interval) - lower(li.interval))::int AS thickness
            FROM lithology_intervals li
            JOIN lithologies l ON l.id = li.lithology_id
            WHERE li.drillhole_id = %s
            ORDER BY lower(li.interval)
        """, [drillhole_uuid])
        lith_rows = cur.fetchall()

        # Alteration: ordered intervals
        cur.execute("""
            SELECT at.code, at.name, ae.intensity,
                   (upper(ae.interval) - lower(ae.interval))::int AS thickness
            FROM alteration_events ae
            JOIN alteration_types at ON at.id = ae.alteration_id
            WHERE ae.drillhole_id = %s
            ORDER BY lower(ae.interval)
        """, [drillhole_uuid])
        alt_rows = cur.fetchall()

        # Build lithology summary
        lith_sequence = []
        lith_totals: dict[str, tuple[str, int]] = {}
        for r in lith_rows:
            if not lith_sequence or lith_sequence[-1] != r["code"]:
                lith_sequence.append(r["code"])
            name, prev = lith_totals.get(r["code"], (r["name"], 0))
            lith_totals[r["code"]] = (name, prev + r["thickness"])

        dom_lith = max(lith_totals.items(), key=lambda x: x[1][1])[1][0] if lith_totals else None

        # Build alteration summary
        alt_sequence = []
        alt_totals: dict[str, tuple[str, int]] = {}
        for r in alt_rows:
            if not alt_sequence or alt_sequence[-1] != r["code"]:
                alt_sequence.append(r["code"])
            name, prev = alt_totals.get(r["code"], (r["name"], 0))
            alt_totals[r["code"]] = (name, prev + r["thickness"])

        dom_alt = max(alt_totals.items(), key=lambda x: x[1][1])[1][0] if alt_totals else None

        # Simple interpretation
        interpretation = None
        if dom_lith and dom_alt:
            interpretation = f"{dom_lith} host rock with {dom_alt.lower()} alteration"
            if "BRX" in lith_sequence or "Breccia" in (dom_lith or ""):
                interpretation += " — breccia-hosted system"
            elif "DIO" in lith_sequence and "POT" in alt_sequence:
                interpretation += " — intrusive-related mineralization"

        logger.info(f"Geology summary for {drillhole_id}: lith={dom_lith}, alt={dom_alt}")

        return {
            "hole_id": drillhole_id,
            "dominant_lithology": dom_lith,
            "lithology_sequence": lith_sequence,
            "dominant_alteration": dom_alt,
            "alteration_sequence": alt_sequence,
            "interpretation": interpretation,
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error fetching geology summary for {drillhole_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching geology summary"
        )

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# GEOSPATIAL: DRILLHOLE LOCATIONS
# =============================

@app.get("/geospatial/drillhole-locations")
def drillhole_locations():
    """
    GeoJSON FeatureCollection of drillhole collar locations.
    Ready for Leaflet mapping.
    """
    
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute("""
            SELECT
                drillhole_id,
                hole_id,
                drillhole_name,
                ST_AsGeoJSON(geom) AS geom,
                max_depth
            FROM v_drillhole_locations
            ORDER BY drillhole_name
        """)

        rows = cur.fetchall()

        features = []

        for r in rows:
            features.append({
                "type": "Feature",
                "properties": {
                    "drillhole_id": str(r["drillhole_id"]),
                    "hole_id": r["hole_id"],
                    "drillhole": r["drillhole_name"],
                    "max_depth": float(r["max_depth"])
                },
                "geometry": json.loads(r["geom"])
            })

        logger.info(f"Generated GeoJSON for {len(features)} drillholes")
        
        return {
            "type": "FeatureCollection",
            "count": len(features),
            "features": features
        }

    except Exception as e:
        logger.error(f"Error fetching drillhole locations: {e}")
        raise HTTPException(status_code=500, detail="Error fetching locations")

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# GEOSPATIAL: GEOLOGICAL DOMAINS
# =============================

@app.get("/geospatial/domains")
def get_domains(
    domain_type: str = Query(None, description="Filter by domain type (epithermal, porphyry, etc)")
):
    """
    GeoJSON FeatureCollection of geological domains (zoning).
    
    **Parameters:**
    - `domain_type`: Filter by epithermal, porphyry, etc.
    """
    
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        base_query = """
            SELECT
                id,
                domain_name,
                domain_type,
                min_depth,
                max_depth,
                ST_AsGeoJSON(domain_geom) AS geom
            FROM geological_domains
            WHERE 1=1
        """
        
        params = []
        
        if domain_type:
            base_query += " AND UPPER(domain_type) = UPPER(%s)"
            params.append(domain_type)
        
        base_query += " ORDER BY domain_type, min_depth"
        
        cur.execute(base_query, params)
        rows = cur.fetchall()

        features = []

        for r in rows:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": str(r["id"]),
                    "name": r["domain_name"],
                    "type": r["domain_type"],
                    "depth_range": f"{float(r['min_depth'])}-{float(r['max_depth'])}m"
                },
                "geometry": json.loads(r["geom"])
            })

        logger.info(f"Generated domains GeoJSON: {len(features)} features")
        
        return {
            "type": "FeatureCollection",
            "count": len(features),
            "filters": {"domain_type": domain_type},
            "features": features
        }

    except Exception as e:
        logger.error(f"Error fetching geological domains: {e}")
        raise HTTPException(status_code=500, detail="Error fetching domains")

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# GEOSPATIAL: DRILLHOLES GEOJSON
# =============================

@app.get("/geospatial/drillholes-geojson")
def drillholes_geojson():
    """
    GeoJSON FeatureCollection with extended drillhole properties.
    """
    
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute("""
            SELECT
                dh.hole_id,
                dh.project_id,
                dh.total_depth,
                ST_AsGeoJSON(c.geom) AS geom
            FROM drillholes dh
            LEFT JOIN collars c ON c.drillhole_id = dh.id
            ORDER BY dh.hole_id
        """)

        rows = cur.fetchall()

        features = []

        for r in rows:
            geom = json.loads(r["geom"]) if r["geom"] else None
            features.append({
                "type": "Feature",
                "properties": {
                    "hole_id": r["hole_id"],
                    "name": r["hole_id"],
                    "project_id": str(r["project_id"]),
                    "max_depth": float(r["total_depth"]) if r["total_depth"] is not None else None
                },
                "geometry": geom
            })

        logger.info(f"Generated extended GeoJSON: {len(features)} drillholes")
        
        return {
            "type": "FeatureCollection",
            "count": len(features),
            "features": features
        }

    except Exception as e:
        logger.error(f"Error fetching drillholes geojson: {e}")
        raise HTTPException(status_code=500, detail="Error fetching geojson")

    finally:
        if cur:
            cur.close()
        if conn:
            db_pool.putconn(conn)

# =============================
# DEBUG & UTILITY
# =============================

def require_admin_token(
    x_admin_token: str = Header(None, alias="X-Admin-Token"),
    authorization: str = Header(None, alias="Authorization"),
):
    """Require ADMIN_TOKEN env var to match provided header.

    Accepts either `X-Admin-Token: <token>` or `Authorization: Bearer <token>`.
    Returns 401 on missing/incorrect token without revealing configuration state.
    """
    expected = os.getenv("ADMIN_TOKEN")

    # Extract token from Authorization header if present
    token = None
    if authorization:
        lower = authorization.lower()
        if lower.startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()
        else:
            token = authorization

    # Prefer explicit X-Admin-Token header when provided
    if x_admin_token:
        token = x_admin_token

    # Do not reveal whether ADMIN_TOKEN is configured; always return generic 401
    if not token or not expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Use constant-time comparison
    if not secrets.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")

    return True


@app.get("/debug-db", dependencies=[Depends(require_admin_token)])
def debug_db():
    """Database connection diagnostics (remove in production)"""
    try:
        database_url_set = bool(os.getenv("DATABASE_URL"))
        
        # Try a test connection
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        cur.close()
        db_pool.putconn(conn)
        
        return {
            "status": "connected",
            "database_url_configured": database_url_set,
            "version": version[:50] + "..." if len(version) > 50 else version,
            "pool_active": db_pool is not None
        }
    except Exception as e:
        logger.error(f"Debug check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Database unavailable: {str(e)[:100]}")