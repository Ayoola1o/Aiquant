# Security hardening — phase 1

This branch applies immediate fail-closed mitigations. It is not a production security certification.

## Required deployment configuration

Set these values in the deployment environment before enabling the related features:

- `AIQUANT_ALLOWED_ORIGINS`: comma-separated exact frontend origins, e.g. `https://your-frontend.example`. Do not use `*` with credentialed requests.
- `TELEGRAM_BOT_TOKEN`: Telegram bot token.
- `TELEGRAM_CHAT_ID`: the owner's private Telegram chat ID. Telegram command handling remains disabled if this is absent.
- `TELEGRAM_ALLOW_RUNTIME_CREDENTIAL_UPDATES`: leave unset or `false`; only set `true` for a controlled administrative workflow.
- `AIQUANT_ENABLE_UNSANDBOXED_BACKTEST`: do not set to `true` on a public deployment. Custom strategy execution is disabled by default because it currently uses unrestricted Python `exec`.

## Changes in this branch

- Removed the hardcoded Telegram owner chat ID and removed self-service `/auth` takeover.
- Restricted Telegram messages and callback buttons to the configured owner's private chat.
- Disabled Telegram runtime credential changes unless explicitly enabled by an operator.
- Replaced wildcard CORS with an explicit environment-configured origin allowlist.
- Enabled conservative risk guard defaults for order value, price collar, asset allocation, concurrent positions, drawdown and heartbeat checks.
- Added the missing `python-dotenv` dependency.
- Disabled unsandboxed user-supplied Python strategy execution by default.

## Remaining blockers before production

1. API authentication and authorization are not yet implemented. Trading, broker, API-key, Telegram configuration and account endpoints must not be exposed publicly until a real server-validated identity/session layer and per-user authorization are implemented.
2. Live order and bot-control routes need explicit server-side role checks, step-up confirmation and hard risk-limit enforcement. CORS is not authentication.
3. Replace browser localStorage secret storage with a server-side encrypted secret vault; rotate any credentials previously stored in browser storage.
4. Move strategy execution into an isolated worker/container with no application secrets, restricted network/filesystem, and CPU/memory/time limits. Only then re-enable backtesting.
5. Move SQLite persistence to managed PostgreSQL for serverless deployment and add migrations.
6. Verify Vercel build/runtime compatibility, model download size and cold-start behavior.
7. Add automated security, authorization, risk-manager and deployment tests. No build or test execution is claimed by this branch.

## Important

Do not enable live brokerage trading on a public deployment based solely on this phase. The branch reduces several immediate risks but does not yet close the unauthenticated API exposure.
