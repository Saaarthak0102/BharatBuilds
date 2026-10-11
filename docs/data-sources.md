# Data Sources

## Live Data Sources (to be implemented)

| Source | Data | API | Notes |
| --- | --- | --- | --- |
| NASA FIRMS | Fire hotspots | https://firms.modaps.eosdis.nasa.gov/api/ | Requires API key. Free tier: 100 req/min. Punjab/Haryana region. |
| Open-Meteo | Weather forecast, wind | https://open-meteo.com/ | Free, no API key. 7-day forecast. |
| CPCB | AQI (Delhi NCR stations) | Varies | Unreliable availability. Fallback to OpenAQ. |
| OpenAQ | AQI (global) | https://api.openaq.org/ | Free tier available. Fallback for CPCB. |

## Air Quality Index (NAQI) Breakpoints

Indian National Air Quality Index (NAQI) categories based on CPCB guidelines.
Source: [CPCB NAQI Document](https://cpcb.nic.in/upload/Downloads/AQI_Bulletin_2015.pdf)

| AQI Category | AQI Range | PM10 (24-hr) | PM2.5 (24-hr) | Health Advice (CPCB Standard) |
| --- | --- | --- | --- | --- |
| **Good** | 0 – 50 | 0 – 50 | 0 – 30 | Air quality is satisfactory, and air pollution poses little or no risk. |
| **Satisfactory** | 51 – 100 | 51 – 100 | 31 – 60 | Minor breathing discomfort to sensitive people. |
| **Moderate** | 101 – 200 | 101 – 250 | 61 – 90 | Breathing discomfort to the people with lungs, asthma and heart diseases. |
| **Poor** | 201 – 300 | 251 – 350 | 91 – 120 | Breathing discomfort to most people on prolonged exposure. |
| **Very Poor** | 301 – 400 | 351 – 430 | 121 – 250 | Respiratory illness on prolonged exposure. |
| **Severe** | 401 – 500 | 430+ | 250+ | Affects healthy people and seriously impacts those with existing diseases. |

## Seeded Sample Data (currently in use)

All sample data is clearly marked with `is_sample: true` and displayed with a "Sample data" badge in the UI.

| Dataset | File | Count | Description |
| --- | --- | --- | --- |
| Machine Slots | `data/seed/machines.json` | 11 | Happy Seeder, rotavator, mulcher, SMS, baler, zero-till drill slots across Punjab & Haryana villages |
| Straw Outlets | `data/seed/straw_outlets.json` | 13 | Biomass power plants, CBG plants, pellet makers, depots, aggregators, brick kilns, thermal co-firing |
| Villages | `data/seed/villages.json` | 8 | Punjab (Patiala, Ludhiana, Sangrur) and Haryana (Karnal) villages |
| Wards | `data/seed/wards.json` | 7 | Delhi NCR areas (East, North, South, Central Delhi, Noida, Gurugram) |
| Sample Reports | `data/seed/sample_reports.json` | 8 | Fictional community burning reports across Punjab, Haryana, and Delhi NCR |

### Credits & Attribution
- **Sample Data**: All sample reports, straw outlets, and machine slots are strictly fictional demonstration data. No real personal identities, contact numbers, vehicle plates, or enterprise facilities are referenced.
- **Illustrative Images**: Sample report photographs located in `apps/web/public/sample-reports/` are AI-generated illustrations created via Gemini image generation tools for demonstration purposes.

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
