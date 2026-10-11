# Saans Platform Demo Inventory: Real vs. Mock & Data Source Audit

This inventory tracks data sources, deployed operational status, mock fallbacks, and backend API routes across the Saans platform.

---

## 1. Screen & Feature Inventory

| Screen / Feature | Route / Component Path | Current Data Source | What is REAL after Deploy + Seed | What must be MOCK |
| :--- | :--- | :--- | :--- | :--- |
| **Landing Page** | `apps/web/app/page.tsx` | Mock file & hardcoded copy (`apps/web/lib/mock/heroMock.ts`, `apps/web/lib/mock/dashboardData.ts`) | Navigation, role CTAs, i18n language toggle | Hero animated counters, live preview card values ("Best day to clear", "142 AQI"), phone mockup graphics |
| **Sign Up** | `apps/web/app/(auth)/signup/page.tsx` | Real Cognito endpoint (`SaansUserPool`), seed files for dropdowns | Cognito user registration, PreSignUp verification (`PreSignupFunction`), DynamoDB user profile creation (`saans-users-dev`) | Village/ward dropdown options populated from seed files (`data/seed/villages.json`, `data/seed/wards.json`) |
| **Login** | `apps/web/app/(auth)/login/page.tsx` | Real Cognito endpoint (`apps/web/lib/auth/cognitoAuth.ts`) | Cognito SRP authentication, JWT ID/Access token exchange, role resolution & automatic dashboard redirect | Forgot password link (non-blocking stub) |
| **Farmer Dashboard** | `apps/web/app/farmer/page.tsx` | Real endpoints (`POST /v1/farmer/plan`, `GET /v1/profile`) with mock fallback | Best day calculation, score breakdown, user profile name/village, machine availability summary | Static weather tile details, subsidy guide information, community impact counter |
| **Farmer Field Planner** | `apps/web/app/farmer/field/page.tsx` | Real endpoint (`POST /v1/farmer/plan`), seed file `data/seed/villages.json` | Deterministic burn-window planner, 7-day scored dates, tool execution trace, Happy Seeder machine match, straw outlet match, template multilingual explanation | Village coordinate directory (`data/seed/villages.json`) |
| **Farmer Machine Booking** | `apps/web/app/farmer/book/page.tsx` | Real endpoints (`POST /v1/farmer/book`, `GET /v1/farmer/bookings`, `POST /v1/farmer/plan`) | Machine slot reservation & lock in `saans-machine-slots-dev`, booking record in `saans-bookings-dev`, booking history retrieval | Sample machine owner phone call integration (sample contacts provided) |
| **Farmer Straw Outlets** | `apps/web/app/farmer/straw-outlets/page.tsx` | Real endpoint (`GET /v1/farmer/straw-outlets`), seed file `data/seed/straw_outlets.json` | DynamoDB scan of `saans-straw-outlets-dev`, deterministic distance calculation, residue matching | Sample depot/aggregator contact hints ("Sample data. Contact nearest depot") |
| **Citizen Dashboard** | `apps/web/app/citizen/page.tsx` | Real endpoints (`GET /v1/today`, `GET /v1/profile`) with mock fallback | Live AQI reading from OpenAQ/cache, 24h trend sparkline, wind speed/direction, health advice, nearby reports | Clean air collective impact counter, static action tips |
| **Citizen Today Detail** | `apps/web/app/citizen/today/page.tsx` | Real endpoint (`GET /v1/today?area=...`) | Real-time AQI badge, category, health advice, 24h trend sparkline, wind speed/direction, smoke drift note | Weather condition/humidity values if unpopulated by monitoring station |
| **Citizen Report** | `apps/web/app/citizen/report/page.tsx` | Real endpoints (`POST /v1/reports/upload-url`, `POST /v1/reports/classify`, `POST /v1/reports`, `GET /v1/reports/{id}`) | S3 presigned photo upload (`saans-reports-photos`), EXIF stripping via Pillow, DynamoDB report storage (`saans-reports-dev`), deterministic automated triage (`ROUTED` or `MERGED`) | When `BEDROCK_ENABLED=false`, classify returns HTTP 503 (`MODEL_UNAVAILABLE`), prompting manual category selection; ward list from seed file (`data/seed/wards.json`) |
| **Shared Live Map** | `apps/web/app/map/page.tsx` | Real endpoint (`GET /v1/map/layers`), seed `data/seed/sample_map.json` | GeoJSON layer generation from DynamoDB reports, FIRMS fire hotspots cache, and machine slots | MapLibre base map vector tiles |
| **Profile Card / Modal** | `apps/web/components/dashboard/ProfileCard.tsx` | Real endpoint (`GET /v1/profile`) | Authenticated user profile retrieval from `saans-users-dev`, role badge, village/ward association, sign out | Local health profile questionnaire tags (`apps/web/lib/mock/healthProfile.ts`) |

---

## 2. API Routes: Real Handler vs. Stub

All API routes are defined in `infra/template.yaml` and implemented under `services/`.

| HTTP Method & Path | Lambda Function Name | Implementation File & Handler | Type | Notes |
| :--- | :--- | :--- | :---: | :--- |
| `GET /v1/health` | `HealthFunction` | `services/api/handlers/health.py:handler` | **Real Handler** | Returns health status, timestamp, stage |
| `POST /v1/farmer/plan` | `FarmerPlanFunction` | `services/api/handlers/farmer_plan.py:handler` | **Real Handler** | Runs deterministic scoring & tools (or Bedrock agent when enabled), caches result with 6h TTL |
| `POST /v1/farmer/book` | `FarmerBookFunction` | `services/api/handlers/farmer_book.py:handler` | **Real Handler** | Validates slot availability, updates `MachineSlotsTable`, creates item in `BookingsTable` |
| `GET /v1/farmer/bookings` | `FarmerBookFunction` | `services/api/handlers/farmer_book.py:handler` | **Real Handler** | Queries user bookings from `BookingsTable` |
| `POST /v1/farmer/slots/refresh` | `SlotRefreshFunction` | `services/api/handlers/slot_refresh.py:handler` | **Real Handler** | Re-seeds/updates machine slot availability |
| `GET /v1/farmer/straw-outlets` | `StrawOutletsFunction` | `services/api/handlers/straw_outlets.py:handler` | **Real Handler** | Queries `StrawOutletsTable` with fallback to `data/seed/straw_outlets.json` |
| `GET /v1/today` | `TodayFunction` | `services/api/handlers/today.py:handler` | **Real Handler** | Reads OpenAQ / Open-Meteo cache and nearby reports from DynamoDB |
| `GET /v1/weather` | `WeatherFunction` | `services/api/handlers/weather.py:handler` | **Real Handler** | Fetches 7-day weather forecast from cache / Open-Meteo |
| `POST /v1/ask` | `AskFunction` | `services/api/handlers/ask.py:handler` | **Stub** | Returns static answers for 3 preset questions (Q&A agent stub) |
| `GET /v1/map/layers` | `MapLayersFunction` | `services/api/handlers/map_layers.py:handler` | **Real Handler** | Generates dynamic GeoJSON layers from DynamoDB reports, FIRMS cache, and machine slots |
| `POST /v1/reports/upload-url` | `ReportsUploadUrlFunction` | `services/api/handlers/reports_upload_url.py:handler` | **Real Handler** | Generates S3 presigned PUT URL with user-scoped prefix |
| `POST /v1/reports/classify` | `ReportsClassifyFunction` | `services/api/handlers/reports_classify.py:handler` | **Real Handler** | Strips EXIF; returns HTTP 503 `MODEL_UNAVAILABLE` when `BEDROCK_ENABLED=false` or Bedrock Vision classification when enabled |
| `POST /v1/reports` | `ReportsFunction` | `services/api/handlers/reports.py:handler` | **Real Handler** | Stores report in `ReportsTable`, triggers async triage execution |
| `GET /v1/reports` | `ReportsFunction` | `services/api/handlers/reports.py:handler` | **Real Handler** | Lists public reports filtered by geohash prefix |
| `GET /v1/reports/{report_id}` | `ReportsFunction` | `services/api/handlers/reports.py:handler` | **Real Handler** | Retrieves report item by `report_id` |
| `DELETE /v1/reports/{report_id}` | `ReportsFunction` | `services/api/handlers/reports.py:handler` | **Real Handler** | Deletes report item by `report_id` (verifying ownership) |
| `POST /v1/reports/{report_id}/triage` | `TriageFunction` | `services/api/handlers/reports_triage.py:handler` | **Real Handler** | Deterministic triage (merges duplicate, sets status `ROUTED`) when Bedrock is disabled, or Bedrock triage agent when enabled |
| `POST /v1/subscriptions` | `SubscriptionsFunction` | `services/api/handlers/subscriptions.py:handler` | **Real Handler** | Creates user alert subscription in `SubscriptionsTable` |
| `GET /v1/subscriptions` | `SubscriptionsFunction` | `services/api/handlers/subscriptions.py:handler` | **Real Handler** | Retrieves subscriptions for authenticated user |
| `DELETE /v1/subscriptions` | `SubscriptionsFunction` | `services/api/handlers/subscriptions.py:handler` | **Real Handler** | Deletes subscription by ID |
| `GET /v1/profile` | `ProfileFunction` | `services/api/handlers/profile.py:handler` | **Real Handler** | Retrieves user profile item from `UsersTable` |
| `POST /v1/profile` | `ProfileFunction` | `services/api/handlers/profile.py:handler` | **Real Handler** | Creates or updates user profile in `UsersTable` |
| `POST /v1/ingest/run` | `IngestFunction` | `services/ingest/handler.py:handler` | **Real Handler** | Executes data ingestion for FIRMS, OpenAQ, and Open-Meteo into DynamoDB |
| Cognito PreSignUp Trigger | `PreSignupFunction` | `services/api/auth/pre_signup.py:handler` | **Real Handler** | Auto-confirms user in Cognito User Pool |
