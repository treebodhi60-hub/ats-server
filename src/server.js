require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { sequelize } = require('./models');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { startCronJob } = require('./services/cron.service');

const app = express();

// Vite picks the next free port (5173, 5174, ...) when the default is taken,
// so trust any localhost/127.0.0.1 dev origin instead of a single hard-coded port.
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

// CLIENT_ORIGIN can be a comma-separated list, e.g. your production Vercel
// domain plus a custom domain: "https://friday-networks.vercel.app,https://app.example.com"
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || LOCALHOST_ORIGIN.test(origin) || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Friday Networks API' }));
app.use('/api', routes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[db] Connected to MySQL');

    // alter:true keeps the schema in sync with the models during development
    // (adds/renames columns) without needing a separate migration step. In
    // production, schema changes should go through an explicit migration
    // instead of an automatic ALTER TABLE on every deploy.
    await sequelize.sync(process.env.NODE_ENV === 'production' ? undefined : { alter: true });
    console.log('[db] Models synced');

    app.listen(PORT, () => {
      console.log(`[server] Friday Networks API running on http://localhost:${PORT}`);
      startCronJob();
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
