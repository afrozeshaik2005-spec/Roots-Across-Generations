import { Router } from 'express';
import multer from 'multer';
import {
  submitJoinRequest,
  getFamilyJoinRequests,
  getMyJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
  editJoinRequestRelationship
} from '../controllers/joinRequest.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const router = Router();

// Protected endpoints (must be authenticated)
router.post('/', authenticateJWT, upload.single('proof'), submitJoinRequest);
router.get('/my-requests', authenticateJWT, getMyJoinRequests);

// Protected Historian endpoints
router.get('/family/:familyId', authenticateJWT, requireRole(['FOUNDER', 'HISTORIAN']), getFamilyJoinRequests);
router.patch('/:requestId/accept', authenticateJWT, acceptJoinRequest);
router.patch('/:requestId/reject', authenticateJWT, rejectJoinRequest);
router.patch('/:requestId/edit', authenticateJWT, editJoinRequestRelationship);

export default router;
