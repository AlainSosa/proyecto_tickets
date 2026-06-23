import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();
const controller = new AuditController();

router.use(authenticate, authorize('admin'));
router.get('/', controller.findAll.bind(controller));

export default router;
