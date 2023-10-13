const express = require('express');
const router = express.Router();
const authController = require('../Controllers/tokenController');

router.get('/login', authController.login);
router.get('/callback', authController.callback);
router.get('/token/:refresh_token', authController.refreshTokens);

module.exports = router;
