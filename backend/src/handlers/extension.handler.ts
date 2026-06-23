import { Router } from 'express';
import { ExtensionController } from '../controllers/extension.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validateCreateExtension, validateUpdateExtension } from '../validators/extension';

const router = Router();
const controller = new ExtensionController();

router.use(authenticate);

router.get('/', controller.findAll.bind(controller));
router.get('/:id', controller.findById.bind(controller));
router.post('/', authorize('admin', 'technician'), validateCreateExtension, controller.create.bind(controller));
router.patch('/:id', authorize('admin', 'technician'), validateUpdateExtension, controller.update.bind(controller));
router.delete('/:id', authorize('admin'), controller.delete.bind(controller));

export default router;
