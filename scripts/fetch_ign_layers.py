"""
Fetch real geological context layers from IGN Argentina WFS.
Processes, simplifies, and outputs TypeScript for the frontend.

Data sources:
  - IGN Argentina WFS: https://wms.ign.gob.ar/geoserver/ign/ows
  - Layers: intermittent streams, perennial rivers, rock outcrops, mining points
"""

import json
import math
import urllib.request
import urllib.parse

WFS_BASE = "https://wms.ign.gob.ar/geoserver/ign/ows"

# Project AOI — centered on drillholes with generous buffer for map context
# Drillhole center: -30.18, -69.35
BBOX_TIGHT = "-69.43,-30.25,-69.27,-30.11"  # ~0.16° x 0.14° around center
BBOX_WIDE = "-69.50,-30.30,-69.20,-30.08"   # wider for perennial rivers

OUTPUT_PATH = "../web/src/data/geology-layers.ts"


def wfs_get_feature(type_name: str, bbox: str, max_features: int = 200) -> dict:
    """Fetch GeoJSON from IGN WFS."""
    params = urllib.parse.urlencode({
        "service": "WFS",
        "version": "1.0.0",
        "request": "GetFeature",
        "typeName": f"ign:{type_name}",
        "outputFormat": "application/json",
        "bbox": bbox,
        "maxFeatures": max_features,
    })
    url = f"{WFS_BASE}?{params}"
    print(f"  Fetching {type_name} (bbox={bbox})...")
    req = urllib.request.Request(url, headers={"User-Agent": "GeoPlatform/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    count = data.get("totalFeatures", len(data.get("features", [])))
    print(f"  → {count} features returned")
    return data


def douglas_peucker(coords: list, epsilon: float) -> list:
    """Simplify a coordinate sequence using Douglas-Peucker algorithm."""
    if len(coords) <= 2:
        return coords

    # Find the point with maximum distance from the line (first → last)
    max_dist = 0
    max_idx = 0
    start = coords[0]
    end = coords[-1]

    for i in range(1, len(coords) - 1):
        dist = point_line_distance(coords[i], start, end)
        if dist > max_dist:
            max_dist = dist
            max_idx = i

    if max_dist > epsilon:
        left = douglas_peucker(coords[: max_idx + 1], epsilon)
        right = douglas_peucker(coords[max_idx:], epsilon)
        return left[:-1] + right
    else:
        return [coords[0], coords[-1]]


def point_line_distance(point, start, end):
    """Perpendicular distance from point to line segment (start→end)."""
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return math.sqrt((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2)
    t = max(0, min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length_sq))
    proj_x = start[0] + t * dx
    proj_y = start[1] + t * dy
    return math.sqrt((point[0] - proj_x) ** 2 + (point[1] - proj_y) ** 2)


def round_coords(coords, precision=4):
    """Round coordinates to given decimal precision."""
    return [round(c, precision) for c in coords]


def simplify_multilinestring(geometry, epsilon=0.0005, precision=4):
    """Simplify MultiLineString: flatten to LineString, apply DP, round coords."""
    all_coords = []
    for line in geometry["coordinates"]:
        all_coords.extend(line)

    # Apply Douglas-Peucker
    simplified = douglas_peucker(all_coords, epsilon)

    # Round coordinates
    simplified = [round_coords(c, precision) for c in simplified]

    # Remove consecutive duplicates
    deduped = [simplified[0]]
    for c in simplified[1:]:
        if c != deduped[-1]:
            deduped.append(c)

    if len(deduped) < 2:
        return None

    return {"type": "LineString", "coordinates": deduped}


def simplify_multipolygon(geometry, epsilon=0.001, precision=4):
    """Simplify MultiPolygon → Polygon, apply DP, round coords."""
    # Take the first polygon (outer ring of first polygon)
    if not geometry["coordinates"]:
        return None

    ring = geometry["coordinates"][0][0]  # outer ring of first polygon
    simplified = douglas_peucker(ring, epsilon)
    simplified = [round_coords(c, precision) for c in simplified]

    # Must be closed and have at least 4 points
    if len(simplified) < 4:
        return None
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])

    return {"type": "Polygon", "coordinates": [simplified]}


def process_rivers(intermittent_data, perennial_data):
    """Process river features into simplified GeoJSON."""
    features = []

    # Process perennial rivers (higher order)
    for f in perennial_data.get("features", []):
        geom = simplify_multilinestring(f["geometry"], epsilon=0.0003, precision=4)
        if geom is None:
            continue
        name = f["properties"].get("nam") or f["properties"].get("fna") or "Unnamed"
        gna = f["properties"].get("gna", "")
        full_name = f"{gna} {name}".strip() if gna else name
        features.append({
            "type": "Feature",
            "properties": {"name": full_name, "kind": "perennial", "source": "IGN"},
            "geometry": geom,
        })

    # Process intermittent streams (lower order)
    for f in intermittent_data.get("features", []):
        geom = simplify_multilinestring(f["geometry"], epsilon=0.001, precision=4)
        if geom is None:
            continue
        name = f["properties"].get("nam") or f["properties"].get("fna") or ""
        gna = f["properties"].get("gna", "")
        full_name = f"{gna} {name}".strip() if gna and name else (name or "Quebrada s/n")
        features.append({
            "type": "Feature",
            "properties": {"name": full_name, "kind": "intermittent", "source": "IGN"},
            "geometry": geom,
        })

    return {"type": "FeatureCollection", "features": features}


def process_outcrops(data):
    """Process rock outcrop features."""
    features = []
    for f in data.get("features", []):
        geom = simplify_multipolygon(f["geometry"], epsilon=0.005, precision=4)
        if geom is None:
            continue
        features.append({
            "type": "Feature",
            "properties": {
                "name": "Afloramiento Rocoso",
                "source": "IGN",
            },
            "geometry": geom,
        })
    return {"type": "FeatureCollection", "features": features}


def process_mines(data):
    """Process mining extraction points."""
    features = []
    for f in data.get("features", []):
        coords = f["geometry"]["coordinates"]
        name = f["properties"].get("nam") or f["properties"].get("fna") or "Unnamed"
        full_name = f["properties"].get("fna", name)
        features.append({
            "type": "Feature",
            "properties": {"name": full_name, "source": "IGN/SEGEMAR"},
            "geometry": {"type": "Point", "coordinates": round_coords(coords, 4)},
        })
    return {"type": "FeatureCollection", "features": features}


def generate_typescript(rivers_fc, outcrops_fc, mines_fc) -> str:
    """Generate the TypeScript module content."""
    rivers_json = json.dumps(rivers_fc, indent=2)
    outcrops_json = json.dumps(outcrops_fc, indent=2)
    mines_json = json.dumps(mines_fc, indent=2)

    return f'''import type {{ FeatureCollection, LineString, Point, Polygon }} from 'geojson'

/**
 * Real geological context layers from official Argentine datasets.
 *
 * Sources:
 *   - Hydrography: IGN Argentina WFS (lineas_de_aguas_continentales)
 *   - Rock outcrops: IGN Argentina WFS (edafologia_afloramiento_rocoso)
 *   - Mining points: IGN/SEGEMAR (puntos_de_extraccion_AA010)
 *
 * Generated by scripts/fetch_ign_layers.py
 * Project AOI: San Juan Andes, Argentina (~-30.18, -69.35)
 */

export interface RiverProperties {{
  name: string
  kind: 'perennial' | 'intermittent'
  source: string
}}

export interface OutcropProperties {{
  name: string
  source: string
}}

export interface MineProperties {{
  name: string
  source: string
}}

export const riversGeoJSON: FeatureCollection<LineString, RiverProperties> =
{rivers_json} as FeatureCollection<LineString, RiverProperties>

export const outcropsGeoJSON: FeatureCollection<Polygon, OutcropProperties> =
{outcrops_json} as FeatureCollection<Polygon, OutcropProperties>

export const minesGeoJSON: FeatureCollection<Point, MineProperties> =
{mines_json} as FeatureCollection<Point, MineProperties>

/** Layer metadata for UI controls */
export const GEOLOGY_LAYERS = {{
  rivers: {{ label: 'Rivers & Streams', color: '#3b82f6' }},
  outcrops: {{ label: 'Rock Outcrops', color: '#a78bfa' }},
  mines: {{ label: 'Mines', color: '#f59e0b' }},
}} as const

export type GeologyLayerKey = keyof typeof GEOLOGY_LAYERS
'''


def main():
    print("=== Fetching real layers from IGN Argentina WFS ===\\n")

    # 1. Intermittent streams (tight bbox)
    print("[1/4] Intermittent streams...")
    intermittent = wfs_get_feature(
        "lineas_de_aguas_continentales_intermitentes", BBOX_TIGHT, max_features=100
    )

    # 2. Perennial rivers (wider bbox to capture main drainage)
    print("[2/4] Perennial rivers...")
    perennial = wfs_get_feature(
        "lineas_de_aguas_continentales_perenne", BBOX_WIDE, max_features=50
    )

    # 3. Rock outcrops
    print("[3/4] Rock outcrops...")
    outcrops_raw = wfs_get_feature(
        "edafologia_afloramiento_rocoso", BBOX_TIGHT, max_features=20
    )

    # 4. Mining points (wider bbox)
    print("[4/4] Mining extraction points...")
    mines_raw = wfs_get_feature(
        "puntos_de_extraccion_AA010", BBOX_WIDE, max_features=20
    )

    # Process
    print("\\nProcessing and simplifying...")
    rivers_fc = process_rivers(intermittent, perennial)
    outcrops_fc = process_outcrops(outcrops_raw)
    mines_fc = process_mines(mines_raw)

    print(f"  Rivers: {len(rivers_fc['features'])} features")
    print(f"  Outcrops: {len(outcrops_fc['features'])} features")
    print(f"  Mines: {len(mines_fc['features'])} features")

    # Count total coordinate points
    total_pts = 0
    for fc in [rivers_fc, outcrops_fc, mines_fc]:
        for f in fc["features"]:
            geom = f["geometry"]
            if geom["type"] == "LineString":
                total_pts += len(geom["coordinates"])
            elif geom["type"] == "Polygon":
                total_pts += sum(len(ring) for ring in geom["coordinates"])
            elif geom["type"] == "Point":
                total_pts += 1
    print(f"  Total coordinate points: {total_pts}")

    # Generate TypeScript
    ts_content = generate_typescript(rivers_fc, outcrops_fc, mines_fc)
    ts_size_kb = len(ts_content.encode()) / 1024
    print(f"\\nOutput size: {ts_size_kb:.1f} KB")

    # Write output
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(ts_content)
    print(f"Written to {OUTPUT_PATH}")
    print("\\nDone! ✓")


if __name__ == "__main__":
    main()
