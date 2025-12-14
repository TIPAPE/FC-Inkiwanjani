// src/routes/news.js
const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

router.get('/', newsController.getPublishedNews);
router.get('/:id', newsController.getNewsById);

module.exports = router;
