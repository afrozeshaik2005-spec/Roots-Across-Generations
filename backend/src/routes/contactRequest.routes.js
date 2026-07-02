import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import {
  createContactRequest,
  getSentRequests,
  getReceivedRequests,
  approveContactRequest,
  rejectContactRequest,
  getRequestStatus
} from '../controllers/contactRequest.controller.js';

const router = Router();

router.use(authenticateJWT);

router.post('/', createContactRequest);
router.get('/sent', getSentRequests);
router.get('/received', getReceivedRequests);
router.get('/status/:ownerId', getRequestStatus);
router.patch('/:id/approve', approveContactRequest);
router.patch('/:id/reject', rejectContactRequest);

export default router;
