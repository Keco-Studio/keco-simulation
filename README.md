# keco-simulation

Standalone **simulation system** frontend (economy, battle, skill sheets, etc.) under route prefix `/simulation-system`.

## Local dev (default port 3001)

```bash
npm install
npm run dev
```

Open `http://localhost:3001/simulation-system`.

From the parent `project/` folder you can start both apps (requires `npx concurrently`):

```bash
./scripts/dev-keco-simulation-stack.sh
```

## Embed in Keco Studio (port 3000)

1. In **keco-studio** `.env.local` (see `keco-studio/env.simulation.example`):

   - `NEXT_PUBLIC_SIMULATION_ENABLED=true`
   - `NEXT_PUBLIC_SIMULATION_ORIGIN=http://localhost:3001`

2. Restart Keco `next dev` (3000) and run this repo with `npm run dev` (3001).

3. Keco loads this app in an iframe in the main panel; without the env vars the simulation entry is hidden.

This app sets `Content-Security-Policy: frame-ancestors` to allow `http://localhost:3000`. For extra parent origins (e.g. staging), set in this repo `.env.local`:

`SIMULATION_FRAME_ANCESTORS=https://your-keco-host.example` (space-separated list).

## Export xlsx

```bash
npm run export:simulation-xlsx
npm run export:battle-simulation-xlsx
```

Output goes to `exports/` (gitignore or commit as you prefer).

## Battle map static assets (`public/`)

`public/assets`, `public/enemy`, and `public/player` are **copied from** `battle-poc/public/` and committed in this repo (do not use symlinks; Vercel cannot build those).

To refresh after POC asset changes (from a sibling `battle-poc` checkout):

```bash
cp -a ../battle-poc/public/{assets,enemy,player} public/
```

## Relation to the main repo

- App logic lives in this repository; **keco-studio** keeps only the iframe shell and sidebar toggle.
- Dependencies use `legacy-peer-deps=true` (root `.npmrc`), matching React 18 and `@ant-design/v5-patch-for-react-19`.
