# Saans: Master Plan

*WeMakeDevs x AWS Environmental Hacks, Air track. Working name: Saans (breath). From field to Delhi.*

## 1. Pitch

An agent-driven web platform for the Delhi Diwali and stubble-burning smog season. It does two things well:

1. **For Punjab farmers:** an AI agent finds the best day to clear the field without burning, books a machine or points to a straw outlet (plant, depot, aggregator), and explains the choice in Punjabi.
2. **For Delhi citizens:** a calm, simple way to see the air, report burning, and get an occasional alert, all on one shared map.

The story for the video: smoke starts in a field, drifts toward Delhi, and one system connects the farmer who can stop it with the citizen who feels it.

**What makes it not a chatbot:** the AI takes actions (calls tools, scores options, re-plans, triages reports, triggers alerts). The only conversational element is a tiny grounded "Ask about today" box.

## 2. Users

| User | Goal | Key actions |
| --- | --- | --- |
| Farmer (Punjab) | Clear the field without burning, cheaply | Pick village and crop stage, get best day, book a machine or find a straw outlet |
| Citizen (Delhi NCR) | Know the air, report sources, avoid exposure | Check Today card, view map, report burning, opt into alerts |
| Judge (hidden user) | Understand value and AWS usage in 3 minutes | Watches the video only |

No officials screen in the MVP. Optional later: a read-only table of reports by ward and status.

## 3. Scope

**Must have**

- Shared map with layers (AQI heatmap, fire hotspots, wind arrows, report markers)
- Burn-window planner agent with machine and straw-outlet fallback
- User accounts via Amazon Cognito (user pool) with custom `role` attribute (farmer | citizen)
- Report flow with photo classification and map markers with status
- Today card for citizens
- Deployed on AWS with a public URL, AWS visible in the video
- Demo mode with cached data, sample-data badges, rate limits, budget alerts

**Should have**

- Scheduled monitoring agent with threshold alerts
- Grounded Ask box with a small question set
- Hindi, English and Punjabi language switching
- PWA behaviour and low-bandwidth mode

**Nice to have**

- Read-only officials table
- Time slider on the map
- Subsidy info line

**Out of scope:** payments, real department integrations, real SMS (needs sender registration in India), voice alerts.

## 4. Screens and UX

**Design language:** calm, not an alarm dashboard. Sky blue and teal, warm sand background, AQI colours only on the map and badges. Large text, icon plus short label on every button, mobile-first, one primary action per screen.

### 4.1 Shared map (home)

- Layers with toggles: AQI heatmap, fire hotspots, wind arrows and smoke-drift cone, citizen reports, machine points (farmer view)
- Default layers by role: farmers start on fires and machines, citizens on AQI and reports
- Tap a marker for a small card (type, time, status, source)
- Freshness label: "Updated 20 min ago" plus a "Sample data" badge wherever data is simulated

### 4.2 Farmer: My field

- Inputs: village (searchable list), crop stage (two or three simple options)
- Output: one card with the best clearing day, a two-line reason in Punjabi, and a collapsible **agent trace** showing which tools were checked
- Primary button: "Book slot". If no machine is free: automatic fallback to the next-best day, or a "Straw outlets" list of nearby plants, depots and aggregators (all sample data with badge, no live prices or availability shown; fallback copy: "Contact your nearest depot or aggregator")
- Optional: a one-line subsidy hint with a link to the official scheme page

### 4.3 Citizen: Today

- AQI for the chosen area, category badge, one plain line of advice (standard AQI-category guidance only, no medical claims)
- Alert opt-in with a single trigger: "Tell me when AQI in my area crosses X"
- Ask about today: three tap-able questions (for example "Is it okay for kids to play outside?"), answered only from fetched data

### 4.4 Citizen: Report

- Take or upload a photo, location auto-filled with a manual override
- Category suggested by the model (crop burning, garbage burning, cracker burning, construction dust) with a confirm step
- After submit: a marker appears on the map with status Received, then Routed, then Resolved (routing is simulated)

### 4.5 Cross-cutting UX

- Language toggle (English, Hindi, Punjabi), remembered in the browser
- Skeleton loaders, clear error states, offline fallback showing the last result
- Accessibility: contrast ratios, keyboard navigation, screen-reader labels, no information conveyed by colour alone

### 4.6 Authentication

- Sign-up: Step 1 choose role (Farmer or Citizen), Step 2 role-specific form
  - Farmer: full name, phone, password, village (searchable), district, land size (acres), main crop and current crop stage, has own machine (yes/no), preferred language
  - Citizen: full name, email or phone, password, area/ward (searchable), preferred language, alert opt-in toggle with AQI threshold, optional household note (kids/elderly toggles)
- Login: single form (no role selector), role read from Cognito `custom:role` claim after sign-in, redirect to `/farmer` or `/citizen`
- Profile: view-only card showing signup details, language, role badge, Sign out. No editing.

### 4.7 Route map

| Route | Screen | Auth |
| --- | --- | --- |
| `/` | Landing page | Public |
| `/signup` | Sign-up (step 1 role, step 2 form) | Public |
| `/login` | Login | Public |
| `/farmer` | Farmer dashboard | Requires role `farmer` |
| `/farmer/field` | Full-page "My field" planner | Requires role `farmer` |
| `/citizen` | Citizen dashboard | Requires role `citizen` |
| `/citizen/today` | Full-page "Today" | Requires role `citizen` |
| `/citizen/report` | Full-page "Report" | Requires role `citizen` |
| `/map` | Full-screen shared map | Signed-in |
| `/profile` | View-only profile | Signed-in |
| `/api/health` | Health check | Public |

## 5. Agents

All agents are built with the **Strands Agents SDK** and run on Lambda, with Bedrock as the model provider.

### 5.1 Burn-window planner (the star)

- **Trigger:** farmer opens My field
- **Tools:** `get_forecast(location)`, `get_wind(location)`, `get_fire_hotspots(district)`, `get_sowing_window(crop_stage)`, `find_machine_slots(village, date_range)`, `find_straw_outlets(village)`, `book_slot(slot_id)`
- **Flow:** gather data, run the deterministic scorer over the next 7 days, pick the best day, check machine availability, re-plan if none is free (next-best day or buyer fallback), then explain in the farmer's language
- **Output (structured JSON):** best\_day, score breakdown, machine or buyer option, reason text, tool trace
- **Why it matters:** it shows planning, tool use and re-planning, which is what separates an agent from a chatbot

### 5.2 Monitoring agent

- **Trigger:** EventBridge schedule (every few hours)
- **Tools:** `get_aqi(area)`, `get_fire_hotspots(region)`, `get_wind(location)`, `find_subscribed_users(area)`, `send_alert(user, message)`
- **Behaviour:** acts only when a threshold is crossed, de-duplicates (no more than one alert per user per time window), writes an audit record

### 5.3 Report triage agent

- **Trigger:** report submitted
- **Tools:** `classify_image(photo)`, `find_nearby_reports(location, radius)`, `write_report(record)`, `update_status(id, status)`
- **Behaviour:** classify with fixed categories, flag low confidence for manual confirmation, merge near-duplicates, set status
- **Optional:** orchestrate this as an AWS Step Functions workflow (validate, classify, de-duplicate, write), which shows AWS clearly in the video

### 5.4 Grounded Ask box

- **Trigger:** citizen taps a suggested question
- **Behaviour:** answers only from the already-fetched AQI, forecast and report data, with a fixed system prompt, a short output limit and a refusal for anything outside scope

## 6. GenAI usage and guardrails

| Use | Model task | Guardrail |
| --- | --- | --- |
| Planner reasoning and explanation | Tool selection, multilingual text | Scoring is rule-based, the model explains and orders tool calls only |
| Report classification | Vision, fixed labels | Confidence threshold, human confirm step, fixed category list |
| Ask box | Grounded Q&A | Data passed in context, no free chat, refusal outside scope |

Guardrails to build:

- Treat all user-submitted text and photo metadata as untrusted input (prompt-injection safe: never let report text change tool behaviour)
- Structured outputs with schema validation before anything is shown or stored
- Bedrock Guardrails or an equivalent output filter for unsafe content
- Per-user and global call limits, timeouts, and a maximum number of tool-call steps per agent run
- No medical advice, only standard AQI-category guidance
- Log every agent run (inputs, tool calls, outputs) for debugging, with personal data excluded

## 7. Planner scoring (sketch)

Score each of the next 7 days from 0 to 100 using transparent rules. Seed the thresholds from official Punjab Agricultural University guidance and verify them before relying on them.

| Factor | Rule idea |
| --- | --- |
| Sowing window | Day must fall inside the recommended window for the crop stage |
| Rain and soil | Penalise heavy rain days that block machinery |
| Wind | Penalise days with winds carrying smoke toward dense areas |
| Nearby fire activity | Penalise days with high hotspot counts in the district |
| Machine availability | Bonus if a machine slot exists on that day |
| Straw outlet fallback | Used when no slot exists in the window (plants, depots, aggregators by district; all sample data) |

The agent receives the scored table and explains the top choice. Keep weights in a config file so judges can read them in the repo.

## 8. Architecture

```
Browser (Next.js PWA, MapLibre)
   |
CloudFront + Amplify Hosting
   |
API Gateway (REST, throttling, CORS)
   |-- Lambda: api-farmer  --> Strands planner agent --> Bedrock
   |-- Lambda: api-citizen --> Today data, Ask agent  --> Bedrock
   |-- Lambda: api-report  --> presigned S3 upload, triage workflow (Step Functions)
   |-- Lambda: api-map     --> map layers from DynamoDB / S3 cache
   |
EventBridge schedule --> Lambda: ingest (FIRMS, Open-Meteo, AQI) --> DynamoDB + S3 cache
EventBridge schedule --> Lambda: monitor agent --> SNS alerts
   |
DynamoDB (reports, slots, subscriptions, cache) | S3 (photos, cached datasets)
CloudWatch (logs, metrics, alarms, dashboard) | Parameter Store / Secrets Manager (keys)
```

Draw this as a clean diagram for the repo, the writeup and the video.

## 9. AWS services and why each one is there

| Service | Role |
| --- | --- |
| Strands Agents SDK (open source) | Agent framework, satisfies the AWS open-source eligibility line |
| Bedrock | Language and vision models, optional Guardrails |
| Lambda | Agents and API handlers |
| API Gateway | Public API, throttling, API keys or usage plans |
| EventBridge | Scheduled ingestion and monitoring |
| DynamoDB | Reports, machine slots, subscriptions, cached data with TTL |
| S3 | Report photos, cached datasets |
| SNS | Alerts (email or web push for the demo) |
| Step Functions (optional) | Report triage workflow, easy to show visually |
| Amazon Location Service | Map tiles for MapLibre (check free-tier limits first) |
| Amplify Hosting | Deployed frontend with a URL |
| CloudFront | CDN and HTTPS in front of the site |
| CloudWatch | Logs, dashboard, alarms, shown in the demo |
| Systems Manager Parameter Store or Secrets Manager | API keys and config |
| AWS Budgets | Cost alarms |
| Cognito | User pool with custom `role` attribute (farmer \| citizen), hosted UI optional, app client for frontend auth |
| Rekognition moderation (optional) | Screen uploaded photos for unsafe content |

## 10. Tech stack

- **Frontend:** Next.js with TypeScript, Tailwind CSS, MapLibre GL JS, next-intl or similar for i18n, PWA service worker for offline caching
- **Backend:** Python 3.12 on Lambda, Pydantic for schema validation, Strands Agents SDK
- **Infrastructure as code:** AWS SAM (or CDK), with SAM CLI and LocalStack for local testing
- **Data sources:** NASA FIRMS (fire hotspots), Open-Meteo (forecast and wind), CPCB or OpenAQ (AQI), seeded sample data for machines, straw outlets (plants/depots/aggregators by district), schemes and ward boundaries. Straw outlet facility lists to be sourced from state pollution control board / agriculture department pages.
- **Tooling:** GitHub, GitHub Actions, ESLint, Prettier, Ruff, pytest, Playwright

## 11. Data model (DynamoDB sketch)

| Table | Key | Main fields |
| --- | --- | --- |
| Users | user\_id (Cognito sub) | role (farmer \| citizen), name, phone, email, language, district/village or area/ward, role-specific fields (land\_size, crop, crop\_stage, has\_own\_machine for farmers; alert\_threshold, household\_note for citizens), created\_at |
| Reports | report\_id | user\_id, category, confidence, geohash, photo\_key, status, created\_at, ttl |
| MachineSlots | village\_id + date | machine\_type, owner\_label, slots\_free, is\_sample |
| StrawOutlets | district\_id + outlet\_id | facility\_type (biomass\_power\_plant \| cbg\_plant \| pellet\_maker \| brick\_kiln \| thermal\_cofiring \| depot \| aggregator), name, contact\_hint, is\_sample |
| Subscriptions | subscription\_id | user\_id, area\_id, threshold, channel, last\_alert\_at |
| DataCache | source + key | payload, fetched\_at, ttl |
| AgentRuns | run\_id | agent, tool\_trace, latency, outcome (no personal data) |

Use geohash or area ids for lookups instead of raw coordinates where possible.

## 12. API sketch

| Method and path | Purpose |
| --- | --- |
| GET /map/layers?bbox= | Layer data for the map |
| GET /today?area= | AQI, advice, freshness |
| POST /ask | Grounded question from the preset list |
| POST /farmer/plan | Run the planner agent |
| POST /farmer/book | Book a machine slot (simulated) |
| GET /farmer/straw-outlets?district= | Straw outlets for a district (sample data) |
| POST /reports/upload-url | Presigned S3 URL for a photo |
| POST /reports | Submit a report |
| GET /reports?bbox= | Reports for the map |
| POST /subscriptions | Alert opt-in |
| POST /auth/profile | Store role-specific fields on signup |
| GET /profile | View user profile |
| GET /health | Health check |

Version the API (for example /v1), validate every request body, and return consistent error shapes.

## 13. Security and privacy

- HTTPS everywhere, strict CORS, API Gateway throttling and usage limits, request size limits
- User accounts via Amazon Cognito (user pool) with `custom:role` attribute; JWT tokens validated on every API call; role-based access control on endpoints
- Presigned S3 uploads with size and type limits, photos in a private bucket, strip EXIF location unless the user confirms
- Least-privilege IAM role per Lambda, no wildcard permissions, keys only in Parameter Store or Secrets Manager
- Dependency scanning (Dependabot), secret scanning, no secrets in the repo history
- Short data retention with DynamoDB TTL, a simple privacy note in the app, and a way to delete a report
- Prompt-injection defences as described in section 6
- Rate limit the report endpoint and add a simple abuse check (duplicate and flood detection)

## 14. Reliability and demo mode

- Cache every external API response with timestamps, serve the last good value on failure
- Retries with backoff, timeouts, and circuit-breaker behaviour in the ingest Lambda
- Fallback order for the planner: live data, cached data, seeded scenario
- **Demo mode switch:** a seeded "Diwali night" scenario you can trigger on demand so the video never depends on live conditions
- Idempotent report submission and alert sending
- Graceful degradation in the UI: partial map layers still render if one source fails

## 15. Observability and cost control

- Structured JSON logs with correlation ids across API, agent and tool calls
- CloudWatch dashboard (requests, errors, latency, agent runs, alerts sent), alarms on error rate and cost
- AWS Budgets alert, Lambda reserved concurrency limits, per-user and global Bedrock call limits, a maximum step count per agent run
- Keep a short cost note in the writeup (approximate monthly cost and what dominates it)

## 16. Testing and validation

- **Unit tests:** scoring rules, data parsers, schema validation
- **Agent tests:** fixed scenarios (rainy week, no machine free, high fire activity) with expected outcomes, and a check that the agent never exceeds its step limit
- **Classifier check:** evaluate the report classifier on 20 to 30 labelled images, report accuracy honestly in the writeup
- **Integration tests:** API contract tests, local runs with SAM CLI and LocalStack
- **End-to-end:** Playwright flows for farmer plan, report submit, map toggle
- **Non-functional:** Lighthouse mobile score, accessibility audit, basic load test on the public endpoints
- **Security checks:** injection attempts on report text, oversized uploads, rate-limit behaviour

## 17. Repository, CI/CD and docs

```
/apps/web          Next.js frontend
/services/api      Lambda handlers
/services/agents   Strands agents and tools
/services/ingest   Scheduled data fetchers
/infra             SAM or CDK templates
/data              Seed data (clearly marked sample)
/docs              Architecture diagram, scoring rules, API docs
/tests             Unit, agent and e2e tests
```

- GitHub Actions: lint, test, build, deploy to a staging stack, then production
- Environments: local, staging, production, with separate parameters
- README with problem, architecture diagram, setup steps, environment variables, how to run demo mode, limitations, licences and credits
- Start the repository **after the hackathon opens** and commit regularly with clear messages, since the history is checked against the event dates

## 18. Performance, accessibility and i18n

- Mobile-first, code-split the map, compress images, lazy-load layers, cap marker counts with clustering
- Cache static assets through CloudFront, keep the farmer card payload small
- WCAG-minded design (contrast, focus states, labels), test with a screen reader once
- Translations kept in resource files, reviewed by a native speaker for Punjabi and Hindi if possible, with a fallback to English

## 19. Build schedule

Deadline and team size are not fixed yet, so this is in phases. Compress or stretch it once you know the window.

| Phase | Work | Done when |
| --- | --- | --- |
| 0. Setup | AWS account, Builder Center profile, SheerID started, API keys, repo after the event opens, SAM skeleton, CI | A hello-world Lambda deploys from CI |
| 1. Data and map | Ingest Lambdas, cache, MapLibre map with layers | Live map with AQI, fires, wind on a public URL |
| 2. Planner | Scorer, tools, Strands agent, seeded machines and buyers | Plan returned with a trace for a test village |
| 3. Farmer UI | My field screen, Punjabi output, Book slot, buyer fallback | Full farmer flow works end to end |
| 4. Reports | Upload, classification, triage workflow, markers, status | A report appears on the map within seconds |
| 5. Citizen | Today card, alert opt-in, monitoring agent, Ask box | Alert received on a threshold crossing |
| 6. Hardening | Demo mode, rate limits, budgets, alarms, tests, accessibility | All checklist items in section 21 pass |
| 7. Polish and record | Theme, copy, video, writeup, architecture diagram | Submission is ready before the deadline |

Cut order if time runs short: time slider, officials table, Ask box, extra languages, Step Functions. Never cut the planner, the map, reports, demo mode or the AWS visibility.

## 20. Demo video script (under 3 minutes)

| Time | Scene |
| --- | --- |
| 0:00 to 0:20 | The problem and the farm-to-Delhi story, map overview |
| 0:20 to 1:20 | Farmer plan: village, best day, trace, no-machine re-plan, book or sell straw |
| 1:20 to 2:00 | Citizen report: photo, classification, marker and status on the map |
| 2:00 to 2:30 | AWS proof: console view of Lambda, DynamoDB, Step Functions, CloudWatch logs of the same request |
| 2:30 to 3:00 | Alert, what is sample data, next steps, closing line |

Check the video link opens in a signed-out browser, upload to YouTube as public or unlisted, and keep it under three minutes.

## 21. Submission and eligibility checklist

- [ ] Registered for the tour, WeMakeDevs account and AWS Builder Center profile ready for every teammate
- [ ] Student verification (SheerID) started or cleared, since Builder Center rewards and the fast-track interview wait on it
- [ ] Repository public, created after the event opened, history matches event dates
- [ ] Uses at least one AWS open-source tool or is deployed on AWS (aim for both)
- [ ] Demo video shows AWS in use, not only mentioned
- [ ] Writeup covers the problem, the build and where AWS fits, and lists AI coding tools used
- [ ] All third-party code, data and assets credited with compatible licences
- [ ] Sample data labelled as sample in the app, video and writeup
- [ ] Submitted on the hackathon's own form before the deadline
- [ ] Judging criteria on the hackathon page checked against the video

## 22. Risks and honest limits

| Risk | Mitigation |
| --- | --- |
| External API down or rate limited | Caching and demo mode |
| Punjabi output quality | Test early, fall back to Hindi and English |
| Bedrock model access or limits | Request access early, set call limits |
| Agent loops or runaway cost | Step caps, concurrency limits, Budgets alarms |
| Wrong agronomy rules | Seed from official PAU guidance, show the source, label advice as guidance |
| Misclassified reports | Confidence threshold plus user confirmation |
| Scope creep | Cut order in section 19 |
| Simulated parts mistaken for real | Sample-data badges and an honest limitations section |

## Changelog

| Date | Change |
| --- | --- |
| 2026-10-08 | **Auth added:** Amazon Cognito user pool with `custom:role` (farmer \| citizen). Users table added to data model. Signup, login, profile screens and routes added. Removed "no accounts / anonymous sessions" from scope. |
| 2026-10-08 | **Straw buyers → Straw outlets:** Renamed to "Straw outlets (plants, depots, aggregators)". Modelled as facility types by district. All entries are seeded sample data (`is_sample: true`) with visible badge. No live prices or availability. Fallback copy: "Contact your nearest depot or aggregator". Facility lists marked as "to be sourced from state pollution control board / agriculture department pages". |
| 2026-10-08 | **Screens & routes:** Added auth screens (signup, login), farmer dashboard, citizen dashboard, profile, full-page field/today/report, and route map table to section 4. |

