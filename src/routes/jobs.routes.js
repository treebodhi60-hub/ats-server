const express = require('express');
const { listJobs, getJob, updateJobStatus, deleteJob } = require('../controllers/jobs.controller');

const router = express.Router();

router.get('/', listJobs);
router.get('/:id', getJob);
router.patch('/:id/status', updateJobStatus);
router.delete('/:id', deleteJob);

module.exports = router;
