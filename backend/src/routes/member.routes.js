import { Router } from 'express';
import multer from 'multer';
import {
  getMemberProfile,
  getCoreFamily,
  getRelationToMe,
  updateMemberProfile,
  updatePrivacySettings,
  addTimelineEvent,
  deleteTimelineEvent,
  uploadProfilePhoto
} from '../controllers/member.controller.js';
import { authenticateJWT, authenticateJWTOptional } from '../middlewares/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

const router = Router();

// Retrieve profile (authenticated members or link viewers)
router.get('/:targetMemberId/relation-to-me', authenticateJWT, getRelationToMe);
router.get('/:memberId/core-family', authenticateJWTOptional, getCoreFamily);
router.get('/:memberId', authenticateJWTOptional, getMemberProfile);

// Update own profiles/privacy
router.patch('/:memberId', authenticateJWT, updateMemberProfile);
router.patch('/:memberId/privacy', authenticateJWT, updatePrivacySettings);

// Manage timeline milestones
router.post('/:memberId/timeline', authenticateJWT, addTimelineEvent);
router.delete('/:memberId/timeline/:eventId', authenticateJWT, deleteTimelineEvent);

// Profile photo upload (Firebase only)
router.post('/:memberId/photo', authenticateJWT, upload.single('photo'), uploadProfilePhoto);

export default router;
