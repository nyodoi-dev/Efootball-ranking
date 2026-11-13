# The Super League

ELO league table for an eFootball group: standings, result reports with admin
approval, seasons, stats, head-to-head, player profiles, trophies and
tournaments (knockout, group + knockout, round robin).

Runs entirely on Cloudflare's free tier:

- **Workers** serves the React app (`src/`, built with Vite) and the API (`worker/`, Hono).
- **D1** holds all data, including pictures uploaded through the site (`schema.sql`).

## Run locally

```bash
npm install
npm run db:local
npm run dev
```

Put a local admin password in `.dev.vars` as `ADMIN_PASSWORD=...`.

## Deploy

```bash
npx wrangler login
npx wrangler d1 create super-league
```

Copy the `database_id` it prints into `wrangler.jsonc`, then:

```bash
npm run db:remote
npm run deploy
npx wrangler secret put ADMIN_PASSWORD
```

The admin panel is at `/admin`.

## Data migration

`scripts/export-supabase.mjs` copied the league out of the old Supabase
project into `data/seed.sql` and `public/img/`. Load it once with
`npx wrangler d1 execute super-league --remote --file=data/seed.sql`.
