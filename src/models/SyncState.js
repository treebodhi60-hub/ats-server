const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Single-row table (id=1) tracking the state of the Gmail sync job.
const SyncState = sequelize.define(
  'SyncState',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    lastSyncStartedAt: DataTypes.DATE,
    lastSyncCompletedAt: DataTypes.DATE,
    lastSuccessfulSyncAt: DataTypes.DATE,
    lastImportedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastStatus: {
      type: DataTypes.ENUM('idle', 'running', 'success', 'error'),
      defaultValue: 'idle',
    },
    lastError: DataTypes.TEXT,
  },
  {
    tableName: 'sync_state',
    timestamps: false,
  }
);

module.exports = SyncState;
