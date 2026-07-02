import { Router } from 'express';
import authRoutes from './auth.routes.js';
import familyRoutes from './family.routes.js';
import memberRoutes from './member.routes.js';
import joinRequestRoutes from './joinRequest.routes.js';
import memoryRoutes from './memory.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';
import messageRoutes from './message.routes.js';
import settingsRoutes from './settings.routes.js';
import contactRequestRoutes from './contactRequest.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/families', familyRoutes);
router.use('/members', memberRoutes);
router.use('/join-requests', joinRequestRoutes);
router.use('/memories', memoryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/messages', messageRoutes);
router.use('/settings', settingsRoutes);
router.use('/contact-requests', contactRequestRoutes);

export default router;
