import { Router } from 'express';
import {
  getAdminDashboard,
  getAdminMembers,
  softDeleteMember,
  restoreMember,
  editRelationship,
  deleteRelationship,
  getAdminAuditLog,
  appointHistorian,
  updateFamilySettings,
  getHealthCheck
} from '../controllers/admin.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';

const router = Router();

// Apply JWT authentication globally to all admin routes
router.use(authenticateJWT);

// Dashboard stats & activity logs
router.get('/dashboard', requireRole(['HISTORIAN']), getAdminDashboard);
router.get('/health', getHealthCheck);
router.get('/audit-log', requireRole(['HISTORIAN']), getAdminAuditLog);

// Members records management
router.get('/members', requireRole(['HISTORIAN']), getAdminMembers);
router.patch('/members/:id/delete', requireRole(['HISTORIAN']), softDeleteMember);
router.patch('/members/:id/restore', requireRole(['HISTORIAN']), restoreMember);

// Relationship connections management
router.patch('/relationships', requireRole(['HISTORIAN']), editRelationship);
router.delete('/relationships', requireRole(['HISTORIAN']), deleteRelationship);

// Elevated Founder-Only appointment triggers
router.patch('/appoint-historian', requireRole(['FOUNDER']), appointHistorian);

// Family configurations management
router.patch('/family-settings', requireRole(['HISTORIAN']), updateFamilySettings);

export default router;
