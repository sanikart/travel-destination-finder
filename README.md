# travel-destination-finder

Find destinations that match your travel preferences.

## Local Preview with PMTiles

This site uses PMTiles (vector tiles stored in a single file) and the PMTiles JS protocol to stream tiles over HTTP. Your local server must support HTTP byte range requests (aka “byte serving”), otherwise PMTiles can’t seek within the file.

If you see this error in the browser console:

- `Error: Server returned no content-length header or content-length exceeding request. Check that your storage backend supports HTTP Byte Serving.`

…it means the server didn’t return a valid `Content-Length` for a ranged request or didn’t honor the `Range` header. Use a server that supports ranges.

Recommended server (works well with PMTiles):

- From `travel-destination-finder/`, run:
  - `http-server -p 8000 -c-1`
    - `-c-1` disables caching so style/data updates show up immediately.
  - Then open `http://localhost:8000/index.html` in the browser.

Note: Python’s `http.server` may work in many environments, but if you hit the error above, switch to `http-server` (installed globally via Homebrew or npm). The stray `favicon.ico 404` warning is harmless; add a favicon if you want to silence it.

To verify byte serving is working (optional):

- `curl -I -H 'Range: bytes=0-1023' http://localhost:8000/data/world_admin0_with_seasons_v3.pmtiles`
- Expect: `HTTP/1.1 206 Partial Content` and a `Content-Length: 1024` header.

## Data → Seasons → Tiles → Preview (End‑to‑End)

Below is the repeatable workflow to regenerate seasons from rasters, build updated tiles, and preview locally. Commands assume the project root is `/Users/sanika/coding` and you’re using the uv venv described in `AGENTS.md`.

### 1) Build seasons from rasters

Inputs:
- Monthly precipitation GeoTIFFs (2020–2024) at `~/Downloads/wc2.1_cruts4.09_10m_prec_2020-2024/`
- Admin-0 countries: `travel-destination-finder/data/world_admin0.geojson`

Run:

```
/Users/sanika/coding/.venv/bin/python utils/precip_to_seasons.py \
  --raster-dir ~/Downloads/wc2.1_cruts4.09_10m_prec_2020-2024 \
  --admin travel-destination-finder/data/world_admin0.geojson \
  --out-parquet travel-destination-finder/data/world_admin0_with_seasons.geo.parquet \
  --out-seasons-json travel-destination-finder/data/seasons.json \
  --id-field ADM0_A3 \
  --method percentile \
  --all-touched
```

Outputs:
- `travel-destination-finder/data/world_admin0_with_seasons.geo.parquet` (adds `jan…dec` columns)
- `travel-destination-finder/data/seasons.json` (used by the map for coloring)

Notes:
- Use absolute thresholds if desired: `--method absolute --abs-thresholds 50,150`

### 2) Export to GeoJSON (for tiling)

We tile from a minimal GeoJSON that includes only the fields the site needs (ID, name, months):

```
/Users/sanika/coding/.venv/bin/python utils/export_geojson.py \
  --in-parquet travel-destination-finder/data/world_admin0_with_seasons.geo.parquet \
  --out-geojson travel-destination-finder/data/world_admin0_with_seasons_v2.geojson
```

### 3) Build vector tiles (MBTiles → PMTiles)

Requirements:
- tippecanoe (Homebrew), pmtiles (Homebrew) installed.

Commands:

```
# MBTiles at zooms 0–6, layer name matches SOURCE_LAYER='countries'
tippecanoe \
  -o travel-destination-finder/data/world_admin0_with_seasons_v3.mbtiles \
  -l countries \
  -n world_admin0_with_seasons_v3 \
  -Z0 -z6 \
  --no-feature-limit --no-tile-size-limit --drop-densest-as-needed \
  travel-destination-finder/data/world_admin0_with_seasons_v2.geojson

# Convert MBTiles → PMTiles
pmtiles convert \
  travel-destination-finder/data/world_admin0_with_seasons_v3.mbtiles \
  travel-destination-finder/data/world_admin0_with_seasons_v3.pmtiles

# Inspect metadata (optional)
pmtiles show travel-destination-finder/data/world_admin0_with_seasons_v3.pmtiles
```

### 4) Point the map to the new tiles

We keep the site referencing the latest PMTiles file. In `travel-destination-finder/index.html`, set:

```
const PMTILES_URL = 'pmtiles://data/world_admin0_with_seasons_v3.pmtiles';
```

The site already sets `SOURCE_LAYER = 'countries'` and `promoteId: 'ADM0_A3'` to match the tiles.

### 5) Serve locally with byte-range support

From `travel-destination-finder/`:

```
http-server -p 8000 -c-1
```

Open:

- http://localhost:8000/index.html

Optional check:

```
curl -I -H 'Range: bytes=0-1023' http://localhost:8000/data/world_admin0_with_seasons_v3.pmtiles
```

Expect `206 Partial Content` and a `Content-Length` equal to the requested byte range size.

## Troubleshooting

- PMTiles byte‑serving error: switch to `http-server` as above.
- Favicon 404: harmless; add `travel-destination-finder/favicon.ico` if you want to remove the message.
- Colors not changing: the site colors by `data/seasons.json`. If you updated tiles only, ensure `seasons.json` also reflects your changes; reload with cache disabled.

## Make-based Workflow

For convenience, a Makefile at the repo root wraps the full pipeline. Defaults are set to your env; you can override variables on the command line.

Common targets:

```
# Build seasons (GeoParquet + seasons.json)
make seasons [METHOD=percentile|absolute ABS_THRESHOLDS=50,150 ALL_TOUCHED=1]

# Export minimal GeoJSON for tiling
make export

# Build tiles (MBTiles -> PMTiles)
make tiles

# Serve locally and verify byte-range support
make serve
make status

# Stop server
make stop
```

Useful variable overrides:

```
make seasons RASTER_DIR=~/Downloads/wc2.1_cruts4.09_10m_prec_2020-2024 METHOD=absolute ABS_THRESHOLDS=40,120
```

Requirements for tiling/serving targets:
- tippecanoe (Homebrew)
- pmtiles (Homebrew)
- http-server (npm: npm i -g http-server)

## References

- Tippecanoe: https://github.com/mapbox/tippecanoe
- PMTiles (CLI and JS): https://protomaps.com/docs/pmtiles
