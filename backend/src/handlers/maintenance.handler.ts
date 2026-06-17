import { Router } from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();
const controller = new MaintenanceController();

router.use(authenticate);

router.get('/', controller.findAll.bind(controller));
router.get('/:id', controller.findById.bind(controller));
router.post('/', authorize('admin', 'technician'), controller.create.bind(controller));
router.patch('/:id', authorize('admin', 'technician'), controller.update.bind(controller));
router.delete('/:id', authorize('admin'), controller.delete.bind(controller));

export default router;
