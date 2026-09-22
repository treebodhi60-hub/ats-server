const { AllowedSender } = require('../models');

async function listSenders(req, res, next) {
  try {
    const senders = await AllowedSender.findAll({ order: [['createdAt', 'ASC']] });
    res.json(senders);
  } catch (err) {
    next(err);
  }
}

async function createSender(req, res, next) {
  try {
    const { email, label } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });
    const sender = await AllowedSender.create({ email: email.toLowerCase().trim(), label });
    res.status(201).json(sender);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'This email is already in the sender list' });
    }
    next(err);
  }
}

async function updateSender(req, res, next) {
  try {
    const sender = await AllowedSender.findByPk(req.params.id);
    if (!sender) return res.status(404).json({ message: 'Sender not found' });
    const { label, active } = req.body;
    if (label !== undefined) sender.label = label;
    if (active !== undefined) sender.active = active;
    await sender.save();
    res.json(sender);
  } catch (err) {
    next(err);
  }
}

async function deleteSender(req, res, next) {
  try {
    const sender = await AllowedSender.findByPk(req.params.id);
    if (!sender) return res.status(404).json({ message: 'Sender not found' });
    await sender.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listSenders, createSender, updateSender, deleteSender };
