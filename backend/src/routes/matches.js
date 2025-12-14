// src/routes/matches.js
const express = require('express');
const router = express.Router();
const matchesController = require('../controllers/matchesController');

router.get('/', matchesController.getMatches);
router.get('/next', matchesController.getNextMatch);
router.get('/last', matchesController.getLastMatch);
router.get('/:id', matchesController.getMatchById);

module.exports = router;
