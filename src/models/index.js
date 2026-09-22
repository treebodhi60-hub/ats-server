const sequelize = require('../config/db');
const JobPosting = require('./JobPosting');
const AllowedSender = require('./AllowedSender');
const SyncState = require('./SyncState');

module.exports = {
  sequelize,
  JobPosting,
  AllowedSender,
  SyncState,
};
