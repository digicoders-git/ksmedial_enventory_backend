const express = require('express');
const router = express.Router();
const {
    getNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
} = require('../controllers/notificationController');
const { protectAny, protectAdminOrShop } = require('../middleware/authMiddleware');

// Public route for Mobile App (Legacy/External)
router.get('/public', getNotifications);

// Protect all other routes for any authenticated user (Admin, Shop, or User)
router.use(protectAny);

router.route('/')
    .get(getNotifications) // Now handles shopId/userId filter internally
    .post(createNotification)
    .delete(clearAllNotifications);

router.route('/read-all').put(markAllAsRead);

router.route('/:id')
    .delete(deleteNotification);

router.route('/:id/read').put(markAsRead);

module.exports = router;
