import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validateCreateAsset, validateUpdateAsset } from '../validators/asset';

const router = Router();
const controller = new AssetController();

router.use(authenticate);

router.get('/', controller.findAll.bind(controller));
router.get('/:id', controller.findById.bind(controller));
router.post('/', authorize('admin', 'technician'), validateCreateAsset, controller.create.bind(controller));
router.patch('/:id', authorize('admin', 'technician'), validateUpdateAsset, controller.update.bind(controller));
router.delete('/:id', authorize('admin'), controller.delete.bind(controller));

export default router;
