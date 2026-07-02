import { Router } from 'express';
import {
  getUserAccount,
  updateUserAccount,
  changePassword,
  softDeleteAccount,
  getActiveSessions,
  logoutAllOtherSessions,
  getUserFamilies,
  setPrimaryFamily,
  leaveFamily,
  updatePreferences
} from '../controllers/settings.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply JWT verification globally to all user preferences/settings routes
router.use(authenticateJWT);

router.get('/account', getUserAccount);
router.patch('/account', updateUserAccount);
router.patch('/password', changePassword);
router.delete('/account', softDeleteAccount);

router.get('/sessions', getActiveSessions);
router.delete('/sessions', logoutAllOtherSessions);

router.get('/families', getUserFamilies);
router.patch('/families/:id/primary', setPrimaryFamily);
router.delete('/families/:id/leave', leaveFamily);

router.patch('/preferences', updatePreferences);

export default router;
