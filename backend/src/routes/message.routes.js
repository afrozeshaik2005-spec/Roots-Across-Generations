import { Router } from 'express';
import {
  startConversation,
  getConversationsList,
  getConversationMessages,
  sendMessage,
  readMessage,
  deleteMessage
} from '../controllers/message.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply JWT authentication globally to all messaging routes
router.use(authenticateJWT);

// Conversations management
router.post('/conversations', startConversation);
router.get('/conversations', getConversationsList);
router.get('/conversations/:id', getConversationMessages);
router.post('/conversations/:id', sendMessage);

// Message status & deletion updates
router.patch('/:messageId/read', readMessage);
router.delete('/:messageId', deleteMessage);

export default router;
