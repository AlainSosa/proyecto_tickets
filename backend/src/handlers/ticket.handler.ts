import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validateCreateTicket, validateUpdateTicket, validateComment } from '../validators/ticket';

const router = Router();
const controller = new TicketController();

router.use(authenticate);

router.get('/', controller.findAll.bind(controller));
router.get('/:id', controller.findById.bind(controller));
router.post('/', validateCreateTicket, controller.create.bind(controller));
router.patch('/:id', authorize('admin', 'technician'), validateUpdateTicket, controller.update.bind(controller));
router.delete('/:id', authorize('admin'), controller.delete.bind(controller));
router.post('/:id/comments', validateComment, controller.addComment.bind(controller));

export default router;
