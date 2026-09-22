const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const JobPosting = sequelize.define(
  'JobPosting',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    messageId: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    // One email can contain more than one job description (a digest), so the
    // unique constraint lives here instead of on messageId: it's the email's
    // Message-ID plus a per-block suffix (the VMS Request ID, or a block index
    // when the email doesn't use that template).
    dedupeKey: {
      type: DataTypes.STRING(550),
      allowNull: false,
      unique: true,
    },
    requestId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    experience: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dateRange: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    senderEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    senderName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    subject: {
      type: DataTypes.STRING(998),
      allowNull: false,
      defaultValue: '(no subject)',
    },
    bodyText: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    bodyHtml: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('new', 'reviewed', 'archived'),
      allowNull: false,
      defaultValue: 'new',
    },
  },
  {
    tableName: 'job_postings',
    timestamps: true,
    indexes: [{ fields: ['senderEmail'] }, { fields: ['receivedAt'] }, { fields: ['status'] }],
  }
);

module.exports = JobPosting;
