# UI Screens & Route Map

## Route Map

| Route | Screen | Auth | Layout |
| --- | --- | --- | --- |
| `/` | Landing page | Public | Full-width, no nav chrome |
| `/signup` | Sign-up (2-step) | Public | Auth shell |
| `/login` | Login | Public | Auth shell |
| `/farmer` | Farmer dashboard | `role=farmer` | Dashboard shell (top bar + split layout) |
| `/farmer/field` | Full-page "My Field" planner | `role=farmer` | Dashboard shell |
| `/citizen` | Citizen dashboard | `role=citizen` | Dashboard shell (top bar + split layout) |
| `/citizen/today` | Full-page "Today" | `role=citizen` | Dashboard shell |
| `/citizen/report` | Full-page "Report" | `role=citizen` | Dashboard shell |
| `/map` | Full-screen shared map | Signed-in | Minimal chrome (back button + layer toggles) |
| `/profile` | View-only profile | Signed-in | Dashboard shell |
| `*` | 404 Not Found | Public | Minimal |

## Screen Descriptions

### Landing Page (`/`)
- Sticky glass navbar: logo, section links, language switch, Login, Sign Up
- Hero: animated gradient background, headline "From field to Delhi", two CTAs ("I'm a farmer", "I'm a citizen")
- Problem strip: animated counters with placeholder numbers (TODO: verify stats)
- How it works: 3 illustrated steps
- Farmer section: burn-window planner preview card with agent trace animation
- Citizen section: Today card + report flow preview
- Map preview: interactive with layer chips
- "Built on AWS" strip: service logos
- Footer: sample-data disclaimer, links
- Every section: scroll-reveal animation (GSAP ScrollTrigger)

### Sign-up (`/signup`)
- **Step 1:** Choose role — two large animated cards (Farmer / Citizen)
- **Step 2:** Role-specific form
  - *Farmer:* name, phone, password, village (searchable), district, land size, crop, crop stage, has machine, language
  - *Citizen:* name, email/phone, password, area/ward (searchable), language, alert opt-in, household note
- Inline validation, password strength, loading states, success → redirect

### Login (`/login`)
- Single form (email/phone + password), no role selector
- Role read from session after login → redirect to `/farmer` or `/citizen`
- Wrong credentials error, loading state, forgot-password stub link

### Farmer Dashboard (`/farmer`)
- **Desktop:** Top bar + split layout
  - LEFT (55-60%): Data panel — best day card, 7-day score strip, fire-near-you, weather, machine summary, straw outlets (sample badge)
  - RIGHT (40%): Action tiles grid — Open planner, Book machine, Straw outlets, Map, Subsidy info, Help
  - Each tile opens a ModalSheet
- **Mobile:** Stacked layout, data cards → 2-col tile grid, BottomNav
- Below: season timeline, tips, recent bookings (scroll-revealed)

### Citizen Dashboard (`/citizen`)
- **Desktop:** Same split pattern
  - LEFT: AQI badge, advice line, 24h trend sparkline, wind/smoke drift note, nearby reports
  - RIGHT: Action tiles — Report burning, Today details, Ask about today, Alert settings, Map, My reports
- **Mobile:** Stacked + BottomNav

### Shared Map (`/map`)
- Full-screen MapLibre with mock GeoJSON layers
- Layer toggles: AQI heatmap, fire hotspots, wind arrows, reports, machines (farmer only)
- Legend, freshness badge, marker detail card
- TODO: Swap to Amazon Location Service basemap

### Profile (`/profile`)
- View-only card with signup details, language, role badge, Sign Out
- No edit controls

### Shared States
- 404 page, loading skeletons, error states, empty states, offline banner

## Wireframe Notes

- All screens mobile-first, tested at 360px, 768px, 1280px
- Dashboard modals → bottom sheets on mobile
- Profile dropdown on desktop → full-screen sheet on mobile
- BottomNav: Home, Map, [Planner|Report], Profile
- Every interactive element has a unique ID for Playwright testing
