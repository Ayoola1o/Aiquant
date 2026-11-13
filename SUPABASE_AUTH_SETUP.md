# Aiquant — Supabase Auth setup

Aiquant uses Supabase Auth for identity. FastAPI validates Supabase access tokens and reads the user's protected `public.profiles` row to resolve the account role.

## Project

- Supabase project: `Aitrader`
- Project reference: `zisuwcgyskqprtzmjdta`
- API URL: `https://zisuwcgyskqprtzmjdta.supabase.co`

## Required environment variables

Set these in the backend/Vercel project environment. Do not commit credentials.

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://zisuwcgyskqprtzmjdta.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | The project's publishable key from Supabase **Settings → API Keys**. The legacy anon key is also accepted as `SUPABASE_ANON_KEY`. |
| `AIQUANT_ALLOWED_ORIGINS` | Exact frontend origin(s), comma-separated. Example: `https://your-production-domain.example,http://localhost:5173`. |

Only the publishable/anon key belongs in the browser. Never place a Supabase secret or service-role key in Vite variables or frontend code.

## Supabase Auth dashboard configuration

1. Open **Authentication → Providers → Email** and enable Email.
2. Keep email confirmation enabled for production.
3. Under **Authentication → URL Configuration**, set the production Site URL and add the local and production callback/redirect URLs used by the frontend.
4. Enable leaked-password protection in **Authentication → Settings/Security**.
5. Prefer asymmetric JWT signing (ES256 or RS256) for public-key verification. The backend also supports legacy HS256 by asking Supabase Auth to validate the token.

## First administrator

New profiles receive the least-privileged `trader` role. Do not accept a role from the signup form or user metadata.

1. Register the first account through Aiquant and confirm the email if required.
2. In Supabase SQL Editor, find the exact account ID using:

```sql
select id, email, role
from public.profiles
where email = 'YOUR_VERIFIED_ACCOUNT_EMAIL';
```

3. After verifying that the row belongs to you, promote only that account:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = 'YOUR_VERIFIED_AUTH_USER_UUID';
```

This is a privileged database operation. Do not expose profile-role updates to authenticated users. Ordinary users can update only display_name and avatar_url.

## Session and API behavior

- Signup, password login, refresh, and logout are handled by Supabase Auth.
- Access and refresh tokens are kept in tab-scoped session storage, not localStorage.
- FastAPI requires `Authorization: Bearer <access_token>` on protected API routes.
- The backend validates issuer, audience, expiry, signature, and authenticated role; profile role is read from the database.
- User IDs and roles are never accepted from request bodies.
- Live WebSocket access uses a one-time 30-second ticket issued only to an authenticated admin; the Supabase JWT is not placed in the WebSocket URL.
- Existing trading routes still rely on global legacy stores. Until each route is migrated to owner-scoped Supabase data, trader accounts are deliberately blocked from those resources. Admin access is retained for the current single-owner environment.

## Legacy records

The 3,009 historical AI decisions and one historical position remain unowned (`user_id IS NULL`). They are not assigned to the first administrator or exposed to trader accounts. New tenant-aware data access must derive `user_id` from the validated JWT, never from client input.

## Deployment checklist

- [ ] Configure the environment variables above.
- [ ] Configure Supabase Email Auth and redirect URLs.
- [ ] Register and verify the first account.
- [ ] Promote the verified owner profile to admin using the SQL above.
- [ ] Deploy and verify login, refresh, logout, and protected API behavior.
- [ ] Keep live trading disabled until broker-secret handling, per-user data isolation, and live-order authorization are separately tested.
