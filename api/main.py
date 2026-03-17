from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import psycopg2
import psycopg2.extras
import json

# -----------------------------
# DATABASE CONFIG
# -----------------------------

import os
from dotenv import load_dotenv
load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", 5433),
    "database": os.getenv("DB_NAME", "geoplatform"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD")
}

# -----------------------------
# APP INIT
# -----------------------------

app = FastAPI(
    title="GeoPlatform Exploration API",
    description="API for geological exploration data",
    version="1.0"
)

# -----------------------------
# CORS (para frontend / Leaflet)
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# DATABASE CONNECTION
# -----------------------------

def get_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection error: {e}"
        )

# -----------------------------
# ROOT
# -----------------------------

@app.get("/")
def root():
    return {
        "message": "GeoPlatform Exploration API running",
        "docs": "/docs",
        "endpoints": [
            "/health",
            "/drillholes",
            "/geospatial/drillhole-locations"
        ]
    }

# -----------------------------
# HEALTH CHECK
# -----------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

# -----------------------------
# DRILLHOLES LIST
# -----------------------------

@app.get("/drillholes")
def drillholes():

    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute("""
            SELECT hole_id
            FROM drillholes
            ORDER BY hole_id
        """)

        rows = cur.fetchall()

        return [{"hole_id": r["hole_id"]} for r in rows]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# -----------------------------
# DRILLHOLE LOCATIONS (GEOJSON)
# -----------------------------

@app.get("/geospatial/drillhole-locations")
def drillhole_locations():

    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute("""
            SELECT
                drillhole_name,
                ST_AsGeoJSON(geom) AS geom
            FROM v_drillhole_locations
        """)

        rows = cur.fetchall()

        features = []

        for r in rows:
            features.append({
                "type": "Feature",
                "properties": {
                    "drillhole": r["drillhole_name"]
                },
                "geometry": json.loads(r["geom"])
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# -----------------------------
# DRILLHOLES GEOJSON DIRECT
# -----------------------------

@app.get("/geospatial/drillholes-geojson")
def drillholes_geojson():

    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute("""
            SELECT
                hole_id,
                ST_AsGeoJSON(collar_geom) AS geom
            FROM drillholes
        """)

        rows = cur.fetchall()

        features = []

        for r in rows:
            features.append({
                "type": "Feature",
                "properties": {
                    "hole_id": r["hole_id"]
                },
                "geometry": json.loads(r["geom"])
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()