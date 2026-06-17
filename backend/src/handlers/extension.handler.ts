import { Router } from 'express';
import { ExtensionController } from '../controllers/extension.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();
const controller = new ExtensionController();

router.use(authenticate);

router.get('/', controller.findAll.bind(controller));
router.get('/:id', controller.findById.bind(controller));
router.post('/', authorize('admin', 'technician'), controller.create.bind(controller));
router.patch('/:id', authorize('admin', 'technician'), controller.update.bind(controller));
router.delete('/:id', authorize('admin'), controller.delete.bind(controller));

export default router;
