import { Router } from 'express';
import { AccessRequestController } from '../controllers/access-request.controller';
import { authenticate, authorize } from '../middlewares/auth';
import {
  validateCreateAccessRequest,
  validateApproveAccessRequest,
} from '../validators/access-request';

const router = Router();
const controller = new AccessRequestController();

router.post('/', validateCreateAccessRequest, controller.create.bind(controller));

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', controller.findAll.bind(controller));
router.patch('/:id/approve', validateApproveAccessRequest, controller.approve.bind(controller));
router.patch('/:id/reject', controller.reject.bind(controller));

export default router;