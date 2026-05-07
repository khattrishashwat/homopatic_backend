const express = require('express');
const { login } = require('../../controllers/user/authController');

const router = express.Router();

router.post('/login', login);

module.exports = router;
