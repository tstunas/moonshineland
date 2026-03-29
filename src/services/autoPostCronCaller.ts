import "dotenv/config";

const DEFAULT_INTERVAL_MS = 30_000;
const DEFAULT_HEALTHCHECK_WAIT_MS = 60_000;
const HEALTHCHECK_POLL_MS = 1_000;

function resolveTickMs(): number {
  const value = Number(process.env.AUTOPOST_CRON_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(value)) {
    return DEFAULT_INTERVAL_MS;
  }

  return Math.max(5_000, Math.trunc(value));
}

function resolveCronUrl(): string {
  const explicitUrl = process.env.AUTOPOST_CRON_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const port = process.env.APP_PORT?.trim() || process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}/api/cron/auto-post`;
}

function resolveHealthcheckUrl(cronUrl: string): string {
  const explicitUrl = process.env.AUTOPOST_HEALTHCHECK_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  try {
    const parsed = new URL(cronUrl);
    return `${parsed.origin}/`;
  } catch {
    return "http://127.0.0.1:3000/";
  }
}

function resolveHealthcheckWaitMs(): number {
  const value = Number(
    process.env.AUTOPOST_HEALTHCHECK_WAIT_MS ?? DEFAULT_HEALTHCHECK_WAIT_MS,
  );
  if (!Number.isFinite(value)) {
    return DEFAULT_HEALTHCHECK_WAIT_MS;
  }

  return Math.max(0, Math.trunc(value));
}

async function waitForServerReady(healthcheckUrl: string, maxWaitMs: number) {
  const started = Date.now();
  let attempts = 0;

  while (Date.now() - started <= maxWaitMs) {
    attempts += 1;
    try {
      const response = await fetch(healthcheckUrl, { method: "GET" });
      if (response.status < 500) {
        const waitedMs = Date.now() - started;
        console.log(
          `[auto-post-cron-caller] server-ready url=${healthcheckUrl} waitedMs=${waitedMs}`,
        );
        return;
      }
    } catch {
      // Ignore startup connection failures until timeout.
    }

    if (attempts % 10 === 0) {
      const waitedMs = Date.now() - started;
      console.log(
        `[auto-post-cron-caller] waiting-server url=${healthcheckUrl} waitedMs=${waitedMs}`,
      );
    }

    await new Promise((resolve) => {
      setTimeout(resolve, HEALTHCHECK_POLL_MS);
    });
  }

  console.warn(
    `[auto-post-cron-caller] healthcheck-timeout url=${healthcheckUrl} maxWaitMs=${maxWaitMs}`,
  );
}

async function main() {
  const tickMs = resolveTickMs();
  const cronUrl = resolveCronUrl();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const healthcheckUrl = resolveHealthcheckUrl(cronUrl);
  const healthcheckWaitMs = resolveHealthcheckWaitMs();

  await waitForServerReady(healthcheckUrl, healthcheckWaitMs);

  let isRunning = false;

  const runOnce = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    const startedAt = new Date().toISOString();

    try {
      const headers: Record<string, string> = {};
      if (cronSecret) {
        headers["x-cron-secret"] = cronSecret;
      }

      const response = await fetch(cronUrl, {
        method: "POST",
        headers,
      });

      const body = await response.text();
      console.log(
        `[auto-post-cron-caller] ${startedAt} status=${response.status} body=${body}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[auto-post-cron-caller] ${startedAt} error=${message}`);
    } finally {
      isRunning = false;
    }
  };

  await runOnce();
  setInterval(() => {
    void runOnce();
  }, tickMs);
}

void main();
