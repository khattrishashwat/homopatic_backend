const express = require('express');
const { login, getMe, logout } = require('../../controllers/user/authController');
const { requireAuth } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/logout', logout);

module.exports = router;
