# RE Listings

A local web application for tracking real estate listings you're interested in. Paste a listing URL and the app scrapes the key details — thumbnail, price, address, city, bedrooms — and saves them to a local SQLite database. Browse them in a scrollable, sortable list with each card linking back to the original listing.

## Features

- **Add by URL** — paste a listing URL, the app fetches the page and extracts details automatically
- **Manual fallback** — if a site blocks scraping or returns partial data, a modal opens pre-filled with whatever was extracted so you can complete the listing by hand
- **Scrollable list view** — thumbnail, price, address, city, bedrooms, and a "View original listing" link on every card
- **Sort** by price or bedrooms, ascending or descending
- **Delete** any listing with one click
- **Local SQLite storage** — listings persist across restarts in `server/listings.db`
- **Responsive design** with Tailwind CSS:
  - **Mobile** (<640px): full-width cards, thumbnail on top
  - **Tablet** (640–1024px): horizontal cards, thumbnail left
  - **Desktop** (≥1024px): wider horizontal cards with larger type

## How to Run

```bash
npm run dev
```

Opens the Vite frontend at http://localhost:5173 and the Express API at http://localhost:3001. Both are launched together via `concurrently`.

On first run, `server/listings.db` is created automatically with the required schema.

## How to Stop the Server

Press `Ctrl+C` in the terminal where `npm run dev` is running. This stops both the Vite dev server and the Express backend.

If a process is left running in the background and you can't find the terminal:

```bash
# Find the processes
lsof -ti:3001   # Express backend
lsof -ti:5173   # Vite frontend

# Kill them
kill $(lsof -ti:3001)
kill $(lsof -ti:5173)
```

## How to View the Database Records

The database is a single SQLite file at `server/listings.db`. A few options:

**Option 1 — sqlite3 CLI (built into macOS):**
```bash
sqlite3 server/listings.db
sqlite> .headers on
sqlite> .mode column
sqlite> SELECT * FROM listings;
sqlite> .quit
```

**Option 2 — one-liner from your shell:**
```bash
sqlite3 server/listings.db "SELECT id, price, address, city, bedrooms FROM listings;"
```

**Option 3 — via the API while the server is running:**
```bash
curl -s http://localhost:3001/api/listings | jq
```

**Option 4 — GUI:** open `server/listings.db` in [DB Browser for SQLite](https://sqlitebrowser.org/) or the VS Code [SQLite Viewer](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer) extension.

### Schema

| column     | type    | notes                          |
|------------|---------|--------------------------------|
| id         | INTEGER | primary key, autoincrement     |
| url        | TEXT    | original listing URL, unique   |
| thumbnail  | TEXT    | first image URL from listing   |
| price      | INTEGER | dollars, nullable              |
| address    | TEXT    | street address                 |
| city       | TEXT    |                                |
| bedrooms   | REAL    | supports half beds (e.g. 1.5)  |
| created_at | INTEGER | unix milliseconds              |

## Project Structure

```
RE-listings/
├── server/
│   ├── index.ts        # Express routes
│   ├── db.ts           # SQLite setup and CRUD helpers
│   ├── scraper.ts      # JSON-LD → Open Graph → CSS selector extraction chain
│   └── listings.db     # SQLite file (created on first run, gitignored)
└── client/
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── types.ts
        └── components/
            ├── AddListingForm.tsx
            ├── ManualEntryForm.tsx
            ├── ListingCard.tsx
            ├── ListingList.tsx
            └── SortControls.tsx
```

## API

| Method | Path                  | Description                                         |
|--------|-----------------------|-----------------------------------------------------|
| GET    | `/api/listings`       | Returns all saved listings                          |
| POST   | `/api/scrape`         | Body `{ url }` — fetches and parses, does not save  |
| POST   | `/api/listings`       | Saves a listing (used after scrape or manual entry) |
| DELETE | `/api/listings/:id`   | Removes a listing                                   |

The Vite dev server proxies `/api/*` → `http://localhost:3001`, so the frontend can call relative URLs.

## Important Notes

### How scraping works

The scraper at [server/scraper.ts](server/scraper.ts) uses a **two-stage hybrid** approach:

1. **Plain fetch first** (~200ms) — fast, works for sites that don't fingerprint clients (e.g. homes.com).
2. **Stealth-patched headless Chromium fallback** (~2–4s) — kicks in automatically if plain fetch fails or returns a bot wall. Bypasses Akamai-protected sites like apartments.com.

Both stages feed into the same JSON-LD → Open Graph → CSS-selector extraction chain. If both stages fail to extract anything useful, the app surfaces a clear error and opens the manual entry form pre-filled with whatever was found.

### Setup

The hybrid scraper depends on `playwright` + `playwright-extra` + `puppeteer-extra-plugin-stealth`, all in the root `package.json`. After cloning:

```bash
npm install
npx playwright install chromium    # one-time, ~150MB browser binary
```

### Site compatibility (as of last test)

| Site            | Stage that works                          | Notes                                            |
|-----------------|-------------------------------------------|--------------------------------------------------|
| homes.com       | Plain fetch                               | Full data, fast                                  |
| apartments.com  | Stealth Playwright fallback               | Akamai-protected; ~2s; full data                 |
| Zillow          | **Neither, currently**                    | PerimeterX has flagged this IP; manual entry only |

Anti-bot detection is moving target. A site that works today may stop working tomorrow if its protection vendor adds new fingerprints, and vice versa. When automatic scraping fails, the manual entry modal pre-fills any partial data the scraper did extract — you can fill in the rest by hand.

### Bypassing PerimeterX (Zillow) requires more

Zillow's PerimeterX/HUMAN protection blocks both plain HTTP clients and stealth-patched headless browsers from datacenter IPs. The only reliable workarounds are:

- A residential proxy service (Bright Data, Oxylabs, etc.) — adds cost
- Running scrapes from your home IP via a local agent — possible but out of scope for this app
- Browser automation that reuses your real Chrome user data dir (cookies, fingerprint) — requires running Chrome on the same machine

None of these are built in. Manual entry remains the fallback for Zillow.

### Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v3
- **Backend:** Node.js + Express + TypeScript (run via `tsx watch`)
- **Storage:** SQLite via `better-sqlite3`
- **Scraping:** built-in `fetch` + `cheerio`
- **Dev runner:** `concurrently`

## Deployment

Short answer: **technically yes, but with real friction** — and depending on what you actually want, deployment may not be worth it.

### The hard parts

This stack has three things that fight free hosting:

1. **Playwright + Chromium** — ~150MB browser binary plus real RAM during scrapes. This rules out serverless platforms (Vercel, Netlify, Cloudflare) — their function bundles cap around 50MB and they don't run native browsers.
2. **SQLite file persistence** — needs a writable filesystem that survives restarts and redeploys. Most free tiers have ephemeral disks, so your data evaporates on every deploy.
3. **No authentication** — the app has zero login. Whoever finds the URL can add, edit, and delete your listings.

### Free hosting options

| Platform | Verdict | Why |
|---|---|---|
| **Fly.io** | Best fit | Free tier covers a small VM that runs Chromium + a 1–3GB persistent volume for the SQLite file. Doesn't sleep. Some setup required. |
| **Render** | OK with caveats | Free web service, but **sleeps after 15 min idle** (cold start ~30s next visit). Persistent disk costs ~$1/mo — without it your SQLite resets on every deploy. |
| **Railway** | Not really free | Free trial credits expire. |
| **Vercel / Netlify / Cloudflare** | ❌ | Can't run Playwright. Could only work if you delete the auto-scraping and use plain fetch only — and even then, SQLite needs an external hosted DB. |

### The bigger gotcha: datacenter IPs scrape worse than your home IP

Zillow's PerimeterX already blocks your home IP. Datacenter IP ranges (Fly.io, Render, etc.) are flagged **harder and faster** by every anti-bot vendor — apartments.com (Akamai) will probably start blocking you too, and you'll end up doing manual entry for everything. The auto-scraping you built may effectively stop working in production.

In other words: deploying does not improve scraping. It usually makes it worse.

### Recommended path by goal

**Goal: "I want to access it from my phone or from anywhere"**
→ **Fly.io.** Setup outline:
1. Add a `Dockerfile` based on `mcr.microsoft.com/playwright:v1.59.1-jammy` (Chromium pre-installed)
2. `fly launch`, mount a 1GB volume for `/app/server/listings.db`
3. Add HTTP basic auth middleware on Express — without this anyone can wipe your data
4. Accept that scraping success rate will drop and you'll do more manual entry

**Goal: "I just want to back it up or share with one other person"** (Recommended)
→ **Skip deployment.** Run the app locally and use [Tailscale](https://tailscale.com/) (free for personal use). It gives you a private URL that points to your laptop, reachable from your phone or another device, with no public exposure. Scraping keeps using your home IP, the SQLite file stays on your machine, no hosting bills, no auth to bolt on. Lowest-effort option that avoids every problem above.

**Goal: "Just curious, want to see it on the internet"**
→ **Render free tier.** Accept the 15-min spin-down and the lost SQLite on every redeploy. Fine for a demo. Don't put real data in it.
