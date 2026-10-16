// PM2 process file: starts the Nest app plus the standalone watchdog and
// finalizer with one command. The two helpers are separate processes, so they
// keep running (and flag stale endpoints) when the Nest app crashes.
//
//   yarn build && pm2 start ecosystem.config.js && pm2 save && pm2 startup
//
// Times are Asia/Dhaka; the helpers set process.env.TZ themselves, but PM2's
// cron_restart uses the server clock, so keep the server on Asia/Dhaka (or
// shift the hours below). These cron_restart values are the only place the
// watchdog and finalizer schedules are defined.
module.exports = {
  apps: [
    {
      name: 'dse-poller',
      script: 'dist/main.js',
      autorestart: true,
    },
    {
      // Exits after each run; PM2 re-launches it on the schedule.
      name: 'dse-watchdog',
      script: 'dist/daily_status/watchdog.js',
      autorestart: false,
      // cron_restart: '*/10 4-8 * * 0-4', // time in UTC, so 4-8 = 10am-2pm Dhaka time (UTC+6), Sun-Thu
      cron_restart: '*/2 3-8 * * 0-6', // time in UTC, so 4-8 = 10am-2pm Dhaka time (UTC+6), Sun-Thu
    },
    {
      name: 'dse-finalizer',
      script: 'dist/daily_status/finalizer.js',
      autorestart: false,
      cron_restart: '5 9 * * *', // time in UTC, so 5 9 = 3:05pm Dhaka time (UTC+6)
    },
  ],
};
