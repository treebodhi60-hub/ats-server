const express = require('express');
const jobsRoutes = require('./jobs.routes');
const sendersRoutes = require('./senders.routes');
const syncRoutes = require('./sync.routes');

const router = express.Router();

router.use('/jobs', jobsRoutes);
router.use('/senders', sendersRoutes);
router.use('/sync', syncRoutes);

module.exports = router;
