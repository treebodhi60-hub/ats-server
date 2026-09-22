const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AllowedSender = sequelize.define(
  'AllowedSender',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'allowed_senders',
    timestamps: true,
  }
);

module.exports = AllowedSender;
