# Data Sources

## Live Data Sources (to be implemented)

| Source | Data | API | Notes |
| --- | --- | --- | --- |
| NASA FIRMS | Fire hotspots | https://firms.modaps.eosdis.nasa.gov/api/ | Requires API key. Free tier: 100 req/min. Punjab/Haryana region. |
| Open-Meteo | Weather forecast, wind | https://open-meteo.com/ | Free, no API key. 7-day forecast. |
| CPCB | AQI (Delhi NCR stations) | Varies | Unreliable availability. Fallback to OpenAQ. |
| OpenAQ | AQI (global) | https://api.openaq.org/ | Free tier available. Fallback for CPCB. |

## Seeded Sample Data (currently in use)

All sample data is clearly marked with `is_sample: true` and displayed with a "Sample data" badge in the UI.

| Dataset | File | Count | Description |
| --- | --- | --- | --- |
| Machine Slots | `data/seed/machines.json` | 5 | Happy Seeder, rotavator, mulcher, SMS slots across Punjab villages |
| Straw Outlets | `data/seed/straw_outlets.json` | 7 | Biomass power plants, CBG plants, pellet makers, depots, aggregators, brick kilns, thermal co-firing |
| Villages | `data/seed/villages.json` | 8 | Punjab (Patiala, Ludhiana, Sangrur) and Haryana (Karnal) villages |
| Wards | `data/seed/wards.json` | 7 | Delhi NCR areas (East, North, South, Central Delhi, Noida, Gurugram) |

## Straw Outlets — sourcing note

> Demand for paddy straw in Punjab/Haryana is institutional, not an open spot market. Government crop-residue guidelines support aggregator-to-industry supply chains. End users include biomass power plants, CBG plants, pellet/briquette makers, brick kilns, and thermal-plant co-firing units. There is no known public live registry of buyers or prices.
>
> **All straw outlet entries are sample data.** Exact facility lists are to be sourced from:
> - State Pollution Control Board publications
> - Agriculture department pages
> - District-level biomass management plans
>
> No prices or availability are shown as live. Fallback copy: "Contact your nearest depot or aggregator."

## Data Caching Strategy

- All external API responses are cached in DynamoDB `DataCache` table with TTL
- S3 cache for map layer GeoJSON serving
- Fallback order: live data → cached data → seeded scenario
- Freshness labels shown in the UI: "Updated X min ago"
