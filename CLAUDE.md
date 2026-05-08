# Gitify — GitHub PR Dashboard

A Next.js 14 (App Router) application for organizing and visualizing GitHub Pull Requests by base branch and stack hierarchy. Inspired by Linear, GitKraken, and GitHub Projects.

## Features

- **Tree view** — PRs grouped under their base branches with stacked PRs nested as children
- **Graph view** — SVG dependency graph showing parent → child PR chains across base columns
- **Analytics** — velocity, time-to-review, release readiness scoring
- **PR detail drawer** — merge readiness score, stack chain, reviewer state, risk analysis
- **Filters** — base branch, author, status, label, conflicts, age
- **Auto-detected stacks** — when PR A's base branch is PR B's head branch, B is treated as A's parent
- **Resilient session** — silent refresh on token expiry, redirect-to-login on refresh failure
- **Dark, terminal-inspired UI** — Geist + JetBrains Mono, electric lime accent

## Architecture

```
app/
├── api/auth/                  # Server routes
│   ├── login/route.ts         # GET → starts OAuth (sets state cookie, redirects to GitHub)
│   ├── callback/route.ts      # POST → validates state, exchanges code, sets refresh cookie
│   ├── refresh/route.ts       # POST → mints new access token from refresh cookie
│   ├── logout/route.ts        # POST → clears cookie
│   └── session/route.ts       # GET → reports cookie presence (debug)
├── login/page.tsx             # Public landing
├── auth/callback/page.tsx     # Receives ?code & ?state, posts to API, stores token in memory
├── dashboard/page.tsx         # Main dashboard
├── settings/page.tsx          # Account & security info
├── layout.tsx                 # Root — fonts, providers
└── globals.css

components/                    # Atomic reusable UI
features/                      # Feature modules (branches, graph, analytics, pr-detail, filters)
hooks/                         # TanStack Query hooks
lib/
├── auth/                      # Server-only — env, cookies, GitHub token exchange
├── github/                    # Client-only — axios, typed API methods
├── design.ts                  # Color tokens + branch theming
├── format.ts                  # Date/string utilities
├── pr-analysis.ts             # PR enrichment + stack detection
└── tokens.ts                  # In-memory access token store
store/                         # Zustand stores
types/                         # TypeScript types
```

## Auth flow

```
1. User clicks "Continue with GitHub"
   → window.location = /api/auth/login

2. Server route generates state, sets HttpOnly cookie, redirects to:
   github.com/login/oauth/authorize?client_id=...&state=...&redirect_uri=...

3. User approves → GitHub redirects to /auth/callback?code=...&state=...

4. Client page POSTs {code, state} → /api/auth/callback
   - Server validates state matches cookie (CSRF)
   - Exchanges code with GitHub using client_secret
   - Sets HttpOnly refresh_token cookie
   - Returns access_token in JSON

5. Client stores access_token in memory (tokenStore)

6. All GitHub API calls use access_token via axios interceptor

7. On 401, single-flight refresh:
   - POST /api/auth/refresh → server uses cookie to get new tokens
   - Retry original request with new access_token

8. If refresh fails, user is redirected to /login
```

**Security**
- `access_token` lives in memory only — lost on tab close, recreated via silent refresh
- `refresh_token` is `HttpOnly`, `Secure` (in prod), `SameSite=Lax`, scoped to `/api/auth`
- `state` cookie protects against CSRF on the callback
- `client_secret` only exists on the server — `import "server-only"` enforces this at build time
- Single-flight refresh prevents race conditions on concurrent 401s

## Setup

### 1. Create a GitHub App

1. Go to https://github.com/settings/apps → **New GitHub App**
2. **Homepage URL**: `http://localhost:3000`
3. **Callback URL**: `http://localhost:3000/auth/callback`
4. **Expire user authorization tokens**: ✅ enabled (this is what enables refresh tokens)
5. **Request user authorization (OAuth) during installation**: ✅
6. **Webhook**: disable (not needed)
7. Permissions (Repository): `Pull requests: Read`, `Contents: Read`, `Metadata: Read`
8. **Where can this GitHub App be installed?**: Any account
9. Create the app, then **generate a Client secret**
10. Install the app on your account/org so it can access your repos

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```bash
GITHUB_CLIENT_ID=Iv1.your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
APP_URL=http://localhost:3000
```

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 → sign in with GitHub.

## Tech stack

| Layer        | Choice                       |
|--------------|------------------------------|
| Framework    | Next.js 14 (App Router)      |
| Language     | TypeScript 5 (strict mode)   |
| Server state | TanStack Query 5             |
| Client state | Zustand 4                    |
| HTTP         | Axios w/ refresh interceptor |
| Styling      | Tailwind CSS 3               |
| Charts       | Recharts                     |
| Icons        | lucide-react                 |
| Fonts        | Geist Sans + Geist Mono      |

## Notes & limitations

- **Per-PR detail fetching**: GitHub's `/pulls` list endpoint omits `additions`, `deletions`, and `mergeable`. We fan out to `/pulls/{n}` for each PR to get accurate data. For repos with many PRs this means several API calls per refresh — well within the 5,000/hour authenticated rate limit, but something to be aware of.
- **Stack detection**: We use the canonical Graphite/Stacked PR convention — a PR is "stacked on" another when its base branch matches the other's head branch. This is detected automatically with no extra metadata required.
- **Mock metrics**: The "time-to-review" chart in Analytics uses placeholder data. Real values would come from review timeline events (`/pulls/{n}/reviews` with `submitted_at`).
- **Merge button**: The merge button in the PR detail drawer is a placeholder. Adding `Pull requests: Write` to the GitHub App and calling `PUT /repos/{o}/{r}/pulls/{n}/merge` would make it functional.
