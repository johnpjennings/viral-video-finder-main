# VideoTools

VideoTools is a Vite + React app for YouTube research and production workflows. This README is written for beginners and walks you through local setup step by step.

## Quick Start (Local)

Pick your OS below and follow the steps exactly.

### macOS

1) Install Node.js (recommended: nvm)

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install --lts
```

2) Install dependencies

```sh
npm install
```

3) Create a `.env` file in the project root

```sh
VITE_POCKETBASE_URL=http://127.0.0.1:8090
YOUTUBE_API_KEY=your_youtube_api_key
```

4) Start the dev server (PocketBase + Vite)

```sh
npm run dev
```

### Windows (PowerShell)

1) Install Node.js (recommended: nvm-windows)

Download and install: https://github.com/coreybutler/nvm-windows/releases

Then in PowerShell:

```powershell
nvm install lts
nvm use lts
```

2) Install dependencies

```powershell
npm install
```

3) Create a `.env` file in the project root

```powershell
VITE_POCKETBASE_URL=http://127.0.0.1:8090
YOUTUBE_API_KEY=your_youtube_api_key
```

4) Start the dev server (PocketBase + Vite)

```powershell
npm run dev
```

### Linux

1) Install Node.js (recommended: nvm)

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install --lts
```

2) Install dependencies

```sh
npm install
```

3) Create a `.env` file in the project root

```sh
VITE_POCKETBASE_URL=http://127.0.0.1:8090
YOUTUBE_API_KEY=your_youtube_api_key
```

4) Start the dev server (PocketBase + Vite)

```sh
npm run dev
```
The app will be available at `http://localhost:5173`.

Example `.env` (copy into a new file named `.env`):

```sh
# PocketBase (local)
VITE_POCKETBASE_URL=http://127.0.0.1:8090

# YouTube Data API v3
YOUTUBE_API_KEY=AIzaSyExampleKeyReplaceMe
```

## Getting a YouTube API Key

You need a YouTube Data API v3 key to use the app. The key is read by PocketBase on the server so it isn't exposed to the browser.

1) Go to the Google Cloud Console: https://console.cloud.google.com/
2) Create a new project (or select an existing one).
3) Go to **APIs & Services** → **Library**.
4) Search for **YouTube Data API v3** and click **Enable**.
5) Go to **APIs & Services** → **Credentials**.
6) Click **Create Credentials** → **API key**.
7) Copy the key and paste it into your `.env` file as `YOUTUBE_API_KEY`.

Tip: You can restrict the key later under **API restrictions** and **IP addresses** for extra safety.

## PocketBase (Local Database)

PocketBase is used for local data and auth. The setup script runs automatically on `npm install`, and migrations are applied automatically.

If you ever need to run it manually:

```sh
./bin/pocketbase serve --dir Uploads
```

To re-run migrations manually:

```sh
./bin/pocketbase migrate up --dir Uploads --migrationsDir pb_migrations
```

## Common Scripts

```sh
npm run dev        # start dev server + PocketBase + trends proxy
npm run build      # production build
npm run preview    # preview production build
npm run lint       # lint
```

## Troubleshooting

- If the app loads but shows no data, check that `YOUTUBE_API_KEY` is set.
- If PocketBase fails to start, make sure `./bin/pocketbase` exists (re-run `npm install`).

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn-ui
