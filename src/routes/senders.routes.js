const express = require('express');
const {
  listSenders,
  createSender,
  updateSender,
  deleteSender,
} = require('../controllers/senders.controller');

const router = express.Router();

router.get('/', listSenders);
router.post('/', createSender);
router.patch('/:id', updateSender);
router.delete('/:id', deleteSender);

module.exports = router;
