const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware.requireAdmin);
router.get('/', dashboardController.getDashboard);

module.exports = router;
