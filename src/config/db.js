const { Sequelize } = require('sequelize');

// Most hosted MySQL providers (PlanetScale, TiDB Cloud, Aiven, etc.) require
// TLS. Set DB_SSL=true in the environment to enable it.
const dialectOptions =
  process.env.DB_SSL === 'true'
    ? { ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } }
    : {};

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions,
    logging: false,
  }
);

module.exports = sequelize;
