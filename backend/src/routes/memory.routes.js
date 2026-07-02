import { Router } from 'express';
import multer from 'multer';
import {
  uploadMemory,
  getFamilyMemories,
  getMemberMemories,
  updateMemory,
  deleteMemory,
  addMemoryTag,
  removeMemoryTag
} from '../controllers/memory.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

const router = Router();

// Upload new memory (image, video, document, etc.)
router.post('/', authenticateJWT, upload.single('file'), uploadMemory);

// Retrieve listings
router.get('/family/:familyId', authenticateJWT, getFamilyMemories);
router.get('/member/:memberId', authenticateJWT, getMemberMemories);

// Edit & Delete details
router.patch('/:memoryId', authenticateJWT, updateMemory);
router.delete('/:memoryId', authenticateJWT, deleteMemory);

// Tags modification
router.post('/:memoryId/tags', authenticateJWT, addMemoryTag);
router.delete('/:memoryId/tags/:memberId', authenticateJWT, removeMemoryTag);

export default router;
