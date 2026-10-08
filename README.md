# Saans — From Field to Delhi

> An agent-driven web platform for the Delhi Diwali and stubble-burning smog season.
> **WeMakeDevs × AWS Environmental Hacks, Air track.**

## What it does

1. **For Punjab farmers:** An AI agent finds the best day to clear the field without burning, books a machine or points to a straw outlet, and explains the choice in Punjabi.
2. **For Delhi citizens:** A calm way to see the air, report burning, and get an occasional alert — all on one shared map.

## Quick Start (Mock Mode)

No AWS account needed. Everything runs locally with mock data.

```bash
# 1. Install frontend dependencies
cd apps/web
npm install

# 2. Set up environment
cp .env.example .env.local
# .env.local should have:
#   NEXT_PUBLIC_AUTH_MODE=mock
#   NEXT_PUBLIC_API_MODE=mock

# 3. Run dev server
npm run dev
# Open http://localhost:3000
```

### Mock mode defaults
- Auth: localStorage-based sessions, no Cognito
- API: All endpoints return typed mock JSON, no Lambda calls
- Data: Sample data with "Sample data" badges visible in the UI

## Switching to AWS (Later)

1. Deploy infrastructure: `cd infra && sam deploy --guided`
2. Update `.env.local`:
   ```
   NEXT_PUBLIC_AUTH_MODE=cognito
   NEXT_PUBLIC_API_MODE=live
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=<from SAM output>
   NEXT_PUBLIC_COGNITO_CLIENT_ID=<from SAM output>
   NEXT_PUBLIC_API_URL=<from SAM output>
   ```
3. Seed DynamoDB tables with `data/seed/*.json`

## Folder Map

```
/apps/web                 Next.js frontend (App Router + TypeScript + Tailwind + GSAP)
  /app                    Pages and routes
  /components             React components by feature area
  /lib                    Auth, API clients, mock data, i18n, animation utilities, types
  /public                 Static assets

/services
  /api                    Python Lambda handlers + Pydantic models + common utilities
  /agents                 Strands Agents SDK stubs (planner, monitor, triage, ask)
  /ingest                 Scheduled data ingestion Lambda stubs

/infra                    AWS SAM template + config
/data/seed                Sample data (all marked is_sample: true)
/docs                     Architecture, UI screens, API, scoring rules, data sources
/tests                    Playwright (web), pytest (API), agent scenario tests
```

## Sample Data Items

All sample data is marked with `is_sample: true` and displayed with a visible "Sample data" badge:

| Dataset | File | Description |
| --- | --- | --- |
| Machine Slots | `data/seed/machines.json` | Happy Seeder, rotavator, mulcher slots |
| Straw Outlets | `data/seed/straw_outlets.json` | Biomass plants, CBG plants, depots, aggregators |
| Villages | `data/seed/villages.json` | Punjab & Haryana village locations |
| Wards | `data/seed/wards.json` | Delhi NCR area locations |
| Mock API responses | `apps/web/lib/mock/` | All API responses in mock mode |

## Limitations

- **All data is simulated.** No live connections to FIRMS, Open-Meteo, CPCB, or any external API.
- **Straw outlets are sample data.** No live prices or availability. Exact facility lists to be sourced from state pollution control board / agriculture department pages.
- **Agents are stubs.** The Strands Agents SDK tools and flows are defined but not connected to Bedrock.
- **No real SMS/push notifications.** SNS alerts are email-only for demo; real SMS needs sender registration in India.
- **Scoring thresholds are estimates.** Must be verified against Punjab Agricultural University guidance.
- **No medical advice.** Only standard AQI-category guidance is provided.

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, GSAP, MapLibre GL JS
- **Backend:** Python 3.12, Lambda, Pydantic, Strands Agents SDK
- **Infrastructure:** AWS SAM, API Gateway, DynamoDB, S3, Cognito, SNS, EventBridge
- **AI/ML:** Amazon Bedrock (Claude 3 Sonnet), Bedrock Guardrails

## Credits

- [Next.js](https://nextjs.org/) — MIT License
- [Tailwind CSS](https://tailwindcss.com/) — MIT License
- [GSAP](https://gsap.com/) — Standard GSAP License (free for non-commercial)
- [MapLibre GL JS](https://maplibre.org/) — BSD 3-Clause License
- [Strands Agents SDK](https://github.com/strands-agents/strands-agents-sdk-python) — Apache 2.0 License
- UI component inspiration from [reactbits.dev](https://reactbits.dev) and [easyui.site](https://easyui.site)

## License

See [LICENSE](./LICENSE) file.
