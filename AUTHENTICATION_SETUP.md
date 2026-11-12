# Aiquant authentication deployment setup

## Required environment variables

Configure these in the deployment platform's environment settings. Never commit their values to Git.

| Variable | Required value |
|---|---|
| `DATABASE_URL` | Managed PostgreSQL connection URL. Required on Vercel; SQLite is only a local-development fallback. |
| `AIQUANT_AUTH_SECRET` | Stable random secret with at least 32 characters. Generate with `openssl rand -hex 32`. Keep the same value across every serverless instance and deployment. |
| `AIQUANT_BOOTSTRAP_ADMIN_KEY` | One-time first-admin setup secret, at least 24 characters. Generate independently, for example with `openssl rand -hex 24`. Enter this value in the first account's registration form. |
| `AIQUANT_COOKIE_SECURE` | Set to `true` for HTTPS production deployments. |
| `AIQUANT_ALLOWED_ORIGINS` | Exact comma-separated frontend origins if the frontend is hosted separately. For same-origin Vercel routing, configure the deployed origin. |

## Initial administrator setup

1. Provision a managed PostgreSQL database and set `DATABASE_URL`.
2. Set `AIQUANT_AUTH_SECRET` and `AIQUANT_BOOTSTRAP_ADMIN_KEY`.
3. Deploy the backend and allow startup to create the authentication tables and indexes.
4. Open the registration screen and create the first account using the bootstrap key. The first successful registration becomes the single administrator.
5. Store the bootstrap key securely. After the first administrator exists, later registrations receive the `trader` role and cannot claim administrator access.
6. Remove or rotate the bootstrap key after initial setup. The existing administrator remains an administrator; new registrations will fail to bootstrap another admin if the key is unset.

## Security behavior

- Passwords are hashed with Argon2id; plaintext passwords are never stored.
- The browser receives an HttpOnly, SameSite=Lax, 12-hour signed session cookie. The session is also stored server-side so logout revokes it immediately.
- API routes require a valid session by default. The live-trading WebSocket also requires a valid administrator session.
- Broker, live trading, Telegram, risk, strategy registry, experiments, history and selected global-control routes are administrator-only.
- State-changing requests with an Origin header are restricted to the same origin.
- The browser no longer treats localStorage as proof of authentication.

## Important production limitation

Aiquant's existing trading engine and several legacy data stores are global rather than tenant-scoped. This change protects access to shared trading and operational controls by making them administrator-only, but it does **not** yet provide independent portfolios, API credentials, strategy ownership, or isolated histories for each trader. Do not grant trader accounts access to global resources until the data-ownership migration is completed.

Vercel's function filesystem is ephemeral. Do not use the SQLite fallback in production; the application startup intentionally fails on Vercel when `DATABASE_URL` is missing. The existing non-authentication application database still has its own SQLite migration work outstanding.

## Tests

From the `backend` directory, install `requirements.txt` and run:

```bash
python -m unittest test_auth
```

Also run the existing backend suite and frontend production build before merging. These checks have not yet been executed by this repository change.
