# Scoring Rules

## Overview

The burn-window planner scores each of the next 7 days from 0 to 100 using transparent, deterministic rules. The AI agent receives this scored table and explains the top choice — it does not override the scores.

## Factors and Weights

| Factor | Max Points | Description |
| --- | --- | --- |
| Sowing Window | 25 | Is the day within the recommended clearing/sowing window for the crop stage? |
| Rain & Soil | 20 | Will rain or wet soil prevent machinery from operating? |
| Wind | 20 | Will wind carry smoke toward populated areas (Delhi NCR)? |
| Fire Activity | 15 | How many active fire hotspots are in the district? |
| Machine Availability | 20 | Is a machine slot (Happy Seeder, rotavator, etc.) available? |
| **Total** | **100** | |

## Detailed Rules

### Sowing Window (0-25 points)
- Day within recommended window: **25 points**
- Day outside window: **0 points**
- Window dates depend on crop stage and are seeded from Punjab Agricultural University (PAU) guidance
- **TODO:** Verify window dates against official PAU publications

### Rain & Soil (0-20 points)
- Precipitation < 2mm: **20 points** (clear, machinery can operate)
- Precipitation 2-10mm: **12 points** (light rain, may delay)
- Precipitation 10-25mm: **5 points** (moderate rain, difficult)
- Precipitation > 25mm: **0 points** (heavy rain, machinery blocked)

### Wind (0-20 points)
- Wind speed < 10 km/h: **20 points** (safe)
- Wind speed 10-20 km/h: **12 points** (moderate)
- Wind speed 20-35 km/h: **5 points** (risky)
- Wind speed > 35 km/h: **0 points** (dangerous)
- **Extra penalty:** -10 if wind direction carries smoke toward Delhi/major cities

### Fire Activity (0-15 points)
- Hotspot count < 5: **15 points** (low activity)
- Hotspot count 5-20: **10 points** (moderate)
- Hotspot count 20-50: **5 points** (high)
- Hotspot count > 50: **0 points** (very high)

### Machine Availability (0-20 points)
- Machine slot available: **20 points**
- Limited slots (≤ 2 remaining): **10 points**
- No machine available: **0 points**
- Straw outlet fallback used when score is 0

## Fallback Logic

When no machine is available for any day in the scoring window:
1. Use the highest-scored day regardless
2. Present straw outlets (plants, depots, aggregators) as the fallback
3. Display: "Contact your nearest depot or aggregator"
4. All straw outlet data is sample data with `is_sample: true`

## Configuration

Weights and thresholds are stored in `services/agents/planner/scoring_config.yaml` for transparency.

## Source Note

> Thresholds are initial estimates for development. They must be verified against official Punjab Agricultural University (PAU) guidance before being relied upon for real recommendations. All advice is labeled as guidance, not directives.
