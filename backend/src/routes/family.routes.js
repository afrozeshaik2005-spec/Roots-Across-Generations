import { Router } from 'express';
import multer from 'multer';
import { createFamily, importFamily, getJoinInfo, getInviteInfo } from '../controllers/family.controller.js';
import { getFamilyTree, addFamilyMember, getFamilyMembers, findRelationship } from '../controllers/member.controller.js';
import { searchFamily } from '../controllers/search.controller.js';
import { authenticateJWT, authenticateJWTOptional } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = Router();

router.post('/', authenticateJWT, createFamily);
router.post('/import', authenticateJWT, upload.single('file'), importFamily);
router.get('/join-info/:familyId', getJoinInfo);
router.get('/:familyId/invite-info', authenticateJWT, requireRole(['MEMBER']), getInviteInfo);
router.get('/:familyId/tree', authenticateJWTOptional, getFamilyTree);
router.get('/:familyId/members', authenticateJWT, getFamilyMembers);
router.get('/:familyId/relationship', authenticateJWT, findRelationship);
router.post('/:familyId/members', authenticateJWT, requireRole(['HISTORIAN']), addFamilyMember);
router.get('/:familyId/search', authenticateJWT, searchFamily);

export default router;
