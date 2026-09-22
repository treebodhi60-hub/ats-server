const { Op } = require('sequelize');
const { JobPosting } = require('../models');

async function listJobs(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.senderEmail) {
      where.senderEmail = req.query.senderEmail;
    }
    if (req.query.search) {
      where[Op.or] = [
        { subject: { [Op.like]: `%${req.query.search}%` } },
        { role: { [Op.like]: `%${req.query.search}%` } },
        { location: { [Op.like]: `%${req.query.search}%` } },
        { bodyText: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const { rows, count } = await JobPosting.findAndCountAll({
      where,
      order: [['receivedAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getJob(req, res, next) {
  try {
    const job = await JobPosting.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job posting not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
}

async function updateJobStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['new', 'reviewed', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    const job = await JobPosting.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job posting not found' });
    job.status = status;
    await job.save();
    res.json(job);
  } catch (err) {
    next(err);
  }
}

async function deleteJob(req, res, next) {
  try {
    const job = await JobPosting.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job posting not found' });
    await job.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listJobs, getJob, updateJobStatus, deleteJob };
