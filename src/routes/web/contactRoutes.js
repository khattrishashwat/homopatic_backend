const express = require('express');
const contactController = require('../../controllers/user/contactController');

const router = express.Router();

router.post('/', contactController.sendContactMessage);

module.exports = router;
