const cron = require('node-cron');
const { runSync } = require('./emailSync.service');

function startCronJob() {
  const intervalMinutes = Number(process.env.SYNC_INTERVAL_MINUTES) || 5;
  const expression = `*/${intervalMinutes} * * * *`;

  console.log(`[cron] Scheduling Gmail sync every ${intervalMinutes} minute(s)`);

  cron.schedule(expression, async () => {
    try {
      const result = await runSync();
      if (result.skipped) {
        console.log(`[cron] Sync skipped: ${result.reason}`);
      } else {
        console.log(`[cron] Sync complete - imported ${result.importedCount} new job posting(s)`);
      }
    } catch (err) {
      console.error('[cron] Sync failed:', err.message);
    }
  });
}

module.exports = { startCronJob };
