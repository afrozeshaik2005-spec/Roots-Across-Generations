import { Router } from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  getNotificationPreferences,
  updateNotificationPreferences
} from '../controllers/notification.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Retrieve notifications list
router.get('/', authenticateJWT, getNotifications);

// Mark as read endpoints
router.put('/:id/read', authenticateJWT, markNotificationAsRead);
router.post('/read-all', authenticateJWT, markAllAsRead);

// Preferences scopes settings
router.get('/preferences', authenticateJWT, getNotificationPreferences);
router.patch('/preferences', authenticateJWT, updateNotificationPreferences);

export default router;
