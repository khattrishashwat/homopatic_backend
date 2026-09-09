const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/user/chatController');

router.get('/config', chatController.getConfig);
router.post('/message', chatController.sendMessage);

module.exports = router;
