import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validateCreateUser, validateUpdateUser } from '../validators/user';

const router = Router();
const controller = new UserController();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', controller.findAll.bind(controller));
router.get('/:id', controller.findById.bind(controller));
router.post('/', validateCreateUser, controller.create.bind(controller));
router.patch('/:id', validateUpdateUser, controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
