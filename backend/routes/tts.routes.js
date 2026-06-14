const express = require('express');
const router = express.Router();
const { handleTts } = require('../controllers/tts.controller');

router.post('/', handleTts);

module.exports = router;