# dse-poller

MDS poller: MySQL (idx, trd, man, mkistat) -> shared MongoDB every 5 min, Sun-Thu 09-16 Dhaka.
Reports into `daily_status` (see docs/daily-status.md). Sibling service: dse-scraper (same database).

    cp .env.example .env   # or use the provided .env
    yarn install && yarn build
    node dist/daily_status/bootstrap    # once per deploy (idempotent)
    yarn start:prod

This package also hosts the cron entrypoints (run them on ONE host only):
`node dist/daily_status/watchdog` (every 10 min) and `node dist/daily_status/finalizer` (15:05 daily);
crontab lines are in docs/daily-status.md. Does NOT need puppeteer. `/companies` is checked by the
watchdog using `COMPANIES_SCRAPE_TIME`, so set the SAME value here as in dse-scraper's .env.
