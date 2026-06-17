import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateLogin, validateRegister } from '../validators/auth';
import { authenticate } from '../middlewares/auth';

const router = Router();
const controller = new AuthController();

router.post('/login', validateLogin, controller.login.bind(controller));
router.post('/register', validateRegister, controller.register.bind(controller));
router.get('/profile', authenticate, controller.profile.bind(controller));
router.get('/me', authenticate, controller.profile.bind(controller));

export default router;
