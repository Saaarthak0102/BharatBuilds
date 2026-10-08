# Contributing to Saans

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Follow the setup instructions in [README.md](./README.md)
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development

- **Frontend:** `cd apps/web && npm run dev`
- **Lint:** `npm run lint` (frontend), `ruff check services/` (backend)
- **Test:** `pytest tests/` (backend), `npx playwright test` (frontend)

## Code Style

- Frontend: ESLint + Prettier (configured in `apps/web/`)
- Backend: Ruff (Python)
- Commit messages: clear and descriptive

## Pull Requests

1. Ensure lint, typecheck, and tests pass
2. Update documentation if needed
3. Add tests for new features
4. Keep PRs focused and small

## Sample Data

All sample data must be marked with `is_sample: true` and displayed with a "Sample data" badge.
Never present sample data as real or live.

## Security

- Never commit secrets, API keys, or personal data
- Treat all user-submitted text as untrusted input
- Report security issues privately (do not open public issues)
