import { Router } from 'express';
import { NetworkPointController } from '../controllers/network-point.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validateCreateNetworkPoint, validateUpdateNetworkPoint } from '../validators/network-point';

const router = Router();
const controller = new NetworkPointController();

router.use(authenticate);

router.get('/', controller.findAll.bind(controller));
router.get('/:id', controller.findById.bind(controller));
router.post('/', authorize('admin', 'technician'), validateCreateNetworkPoint, controller.create.bind(controller));
router.patch('/:id', authorize('admin', 'technician'), validateUpdateNetworkPoint, controller.update.bind(controller));
router.delete('/:id', authorize('admin'), controller.delete.bind(controller));

export default router;
