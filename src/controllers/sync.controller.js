const { SyncState } = require('../models');
const { runSync } = require('../services/emailSync.service');

async function getStatus(req, res, next) {
  try {
    const state = await SyncState.findByPk(1);
    res.json(
      state || {
        lastStatus: 'idle',
        lastSyncStartedAt: null,
        lastSyncCompletedAt: null,
        lastSuccessfulSyncAt: null,
        lastImportedCount: 0,
        lastError: null,
      }
    );
  } catch (err) {
    next(err);
  }
}

async function triggerSync(req, res, next) {
  try {
    const result = await runSync();
    res.json(result);
  } catch (err) {
    res.status(502).json({ message: 'Sync failed', error: err.message });
  }
}

module.exports = { getStatus, triggerSync };
