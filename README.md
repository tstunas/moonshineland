This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

For AutoPost development mode, run:

```bash
npm run dev:autopost
```

`dev:autopost` uses fixed port `3100` for both app and cron caller.

This project uses webpack mode in development (`next dev --webpack`) to avoid
intermittent Turbopack cache compaction errors.

If you still hit stale cache issues, run:

```bash
pkill -f "next dev" || true
rm -rf .next/dev/cache/turbopack
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production With PM2 (Web + External Cron Caller)

Install PM2 globally once:

```bash
npm install -g pm2
```

Build and start both processes:

```bash
npm ci
npm run build
npm run pm2:start
```

The second PM2 process does not post directly.
It calls `/api/cron/auto-post` every 30 seconds.

Optional environment variables:

```bash
# Web and cron caller will share APP_PORT automatically.
APP_PORT=3000

# Optional overrides (if omitted, APP_PORT based defaults are used).
AUTOPOST_CRON_URL=http://127.0.0.1:3000/api/cron/auto-post
AUTOPOST_CRON_INTERVAL_MS=30000
AUTOPOST_HEALTHCHECK_URL=http://127.0.0.1:3000/
AUTOPOST_HEALTHCHECK_WAIT_MS=60000
CRON_SECRET=your-secret
```

Useful PM2 commands:

```bash
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
npm run pm2:delete
```

Persist PM2 processes across server reboot:

```bash
pm2 save
pm2 startup
```
