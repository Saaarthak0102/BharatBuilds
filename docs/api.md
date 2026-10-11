# API Documentation

## Base URL

- **Local:** `http://localhost:3000/api` (mock mode)
- **Staging:** `https://<api-id>.execute-api.ap-south-1.amazonaws.com/staging/v1`
- **Production:** `https://<api-id>.execute-api.ap-south-1.amazonaws.com/prod/v1`

## Authentication

All endpoints (except `/health`) require a valid JWT token from Cognito in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Role-based access: some endpoints require `custom:role = farmer` or `custom:role = citizen`.

## Error Response Format

```json
{
  "error": {
    "status": 400,
    "message": "Description of what went wrong"
  },
  "correlation_id": "uuid"
}
```

## Endpoints

### GET /v1/health
- **Auth:** None
- **Response:** `{ "status": "healthy", "timestamp": "...", "version": "0.1.0" }`

### POST /v1/farmer/plan
- **Auth:** `role=farmer`
- **Body:** `{ "village_id": string, "crop_stage": "harvested"|"partially_cleared"|"standing", "language": "en"|"hi"|"pa" }`
- **Response:** PlanResult (best_day, score_breakdown, machine_option, straw_outlet_option, reason_text, tool_trace, seven_day_scores, is_sample)

### POST /v1/farmer/book
- **Auth:** `role=farmer`
- **Body:** `{ "slot_id": string, "village_id": string, "date": "YYYY-MM-DD", "idempotency_key": string }`
- **Response:** `{ "booking_id": string, "status": "PENDING", "acres": number, "is_sample": true }`

### GET /v1/farmer/bookings
- **Auth:** `role=farmer`
- **Response:**
  ```json
  {
    "bookings": [{ "booking_id": "...", "status": "PENDING", "acres": 5.0, ... }],
    "counts_by_status": { "PENDING": 1, "CONFIRMED": 0, "COMPLETED": 0, "CANCELLED": 0 },
    "acres": 5.0,
    "impact": {
      "acres_avoided_est": 5.0,
      "tonnes_straw_diverted_est": 11.0,
      "pm25_kg_saved_est": 71.5,
      "co2_tonnes_saved_est": 16.06,
      "financial_savings_inr_est": 5000.0,
      "metrics": { ... },
      "factors_used": { ... },
      "source": "TO_VERIFY",
      "is_estimate": true
    }
  }
  ```

### GET /v1/weather
- **Auth:** Signed-in
- **Query:** `?location_id=<village_or_ward_id>`
- **Response:**
  ```json
  {
    "location_id": "village-patiala-001",
    "current": 28.5,
    "today_high": 32.0,
    "today_low": 21.0,
    "rain_chance": 10.0,
    "uv": 6.5,
    "sunset": "18:15",
    "wind": { "speed": 14.2, "direction": 310 },
    "humidity": 45,
    "condition": "Clear",
    "hourly_summary": [...],
    "fetched_at": "...",
    "is_sample": false
  }
  ```
- **Error (Unknown ID):** 404 `{ "error": { "status": 404, "message": "Location '...' not found in weather cache" }, "correlation_id": "..." }`

### GET /v1/farmer/straw-outlets
- **Auth:** `role=farmer`
- **Query:** `?district=<district_id>`
- **Response:** `{ "outlets": [{ "outlet_id": "...", "district_id": "...", "name": "...", "facility_type": "...", "lat": 30.42, "lng": 76.40, "accepts": ["paddy_straw"], "pickup_support": "yes", "contact_hint": "...", "is_sample": true }], "district": "patiala", "is_sample": true }`

### GET /v1/today
- **Auth:** `role=citizen`
- **Query:** `?area=<area_id>`
- **Response:** TodayResponse
  ```json
  {
    "area_id": "ward-east-delhi-001",
    "area_name": "Anand Vihar, East Delhi",
    "aqi": 185,
    "aqi_category": "Moderate",
    "aqi_color": "#FFFF00",
    "advice": "...",
    "freshness": "...",
    "is_sample": false,
    "trend_24h": [...],
    "forecast_summary": "...",
    "latest_alert_message": null,
    "fires_24h": 48,
    "sources": [
      { "name": "aqi", "fetched_at": "...", "is_sample": false },
      { "name": "open_meteo", "fetched_at": "...", "is_sample": false },
      { "name": "firms", "fetched_at": "...", "is_sample": false }
    ],
    "wind": { "speed_kmh": 12, "direction": "NW", "description": "..." },
    "nearby_reports": [...]
  }
  ```

### POST /v1/ask
- **Auth:** `role=citizen`
- **Body:** `{ "question": string (preset only), "area_id": string }`
- **Response:** `{ "question": string, "answer": string, "sources": [...], "is_sample": true }`

### GET /v1/map/layers
- **Auth:** Signed-in
- **Query:** `?bbox=minLng,minLat,maxLng,maxLat&layers=aqi,fires,reports,machines` (optional)
- **Response:** MapLayers (aqi_heatmap, fire_hotspots, wind_arrows, report_markers, machine_points, freshness) reading real DynamoDB tables with sample fallbacks.

### POST /v1/reports/upload-url
- **Auth:** Signed-in
- **Body:** `{ "content_type": "image/jpeg"|"image/png"|"image/webp", "file_size": number }`
- **Response:** `{ "upload_url": string, "photo_key": string, "expires_in": 300 }`

### POST /v1/reports
- **Auth:** Signed-in
- **Body:** `{ "photo_key": string, "location": {"lat": number, "lng": number}, "category": string, "category_confirmed": boolean, "notes": string (optional, UNTRUSTED) }`
- **Response:** `{ "report_id": string, "status": "received", ... }`

### GET /v1/reports
- **Auth:** Signed-in
- **Query:**
  - `?mine=true` - Caller's reports from GSI (excludes sample items) with `status_counts`
  - `?bbox=minLng,minLat,maxLng,maxLat` - Spatial bounding box
  - `?category=crop_burning` - Category filter
  - `?limit=20` - Limit (default 20, max 50)
- **Response (Community Feed):** `{ "reports": [{ "report_id": "...", "category": "...", "status": "...", "area_name": "...", "public_lat": 30.48, "public_lng": 76.59, "created_at": "...", "confidence_label": "...", "needs_review": false, "merged_count": 1, "photo_url": "...", "is_sample": true, "is_mine": false }], "is_sample": true }`

### POST /v1/subscriptions
- **Auth:** Signed-in
- **Body:** `{ "area_id": string, "threshold": number (0-500), "channel": "email"|"push" }`
- **Response:** `{ "subscription_id": string, "status": "active", ... }`

### POST /v1/auth/profile
- **Auth:** Signed-in
- **Body:** Role-specific profile fields (see profile.py handler for full schema)
- **Response:** User profile object

### GET /v1/profile
- **Auth:** Signed-in
- **Response:** Current user's profile with role-specific fields
