const appPort = process.env.APP_PORT?.trim() || process.env.PORT?.trim() || "3000";
const cronUrl =
  process.env.AUTOPOST_CRON_URL?.trim() ||
  `http://127.0.0.1:${appPort}/api/cron/auto-post`;
const healthcheckUrl =
  process.env.AUTOPOST_HEALTHCHECK_URL?.trim() ||
  `http://127.0.0.1:${appPort}/`;

module.exports = {
  apps: [
    {
      name: "moonshineland2",
      cwd: ".",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
        PORT: appPort,
      },
    },
    {
      name: "moonshineland2-cron",
      cwd: ".",
      script: "npm",
      args: "run autopost:caller",
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        AUTOPOST_CRON_URL: cronUrl,
        AUTOPOST_HEALTHCHECK_URL: healthcheckUrl,
      },
    },
  ],
};
