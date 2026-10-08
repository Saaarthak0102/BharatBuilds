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
- **Body:** `{ "slot_id": string, "village_id": string, "date": "YYYY-MM-DD" }`
- **Response:** `{ "booking_id": string, "status": "confirmed", "slot": {...}, "is_sample": true }`

### GET /v1/farmer/straw-outlets
- **Auth:** `role=farmer`
- **Query:** `?district=<district_id>`
- **Response:** `{ "outlets": [...], "is_sample": true }`

### GET /v1/today
- **Auth:** `role=citizen`
- **Query:** `?area=<area_id>`
- **Response:** TodayResponse (aqi, aqi_category, advice, trend_24h, wind, nearby_reports, freshness, is_sample)

### POST /v1/ask
- **Auth:** `role=citizen`
- **Body:** `{ "question": string (preset only), "area_id": string }`
- **Response:** `{ "question": string, "answer": string, "sources": [...], "is_sample": true }`

### GET /v1/map/layers
- **Auth:** Signed-in
- **Query:** `?bbox=minLng,minLat,maxLng,maxLat` (optional)
- **Response:** MapLayers (aqi_heatmap, fire_hotspots, wind_arrows, report_markers, machine_points, freshness)

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
- **Query:** `?bbox=minLng,minLat,maxLng,maxLat`
- **Response:** `{ "reports": [...], "is_sample": true }`

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
