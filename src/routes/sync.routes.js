const express = require('express');
const { getStatus, triggerSync } = require('../controllers/sync.controller');

const router = express.Router();

router.get('/status', getStatus);
router.post('/run', triggerSync);

module.exports = router;
