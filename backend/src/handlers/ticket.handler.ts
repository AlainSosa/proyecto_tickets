import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authenticate, authorize } from '../middlewares/auth';
import {
  validateAssignTicket,
  validateCloseTicket,
  validateComment,
  validateCreateTicket,
  validateFollowUp,
  validatePriority,
  validateSolution,
  validateStatus,
  validateUpdateTicket,
} from '../validators/ticket';

const router = Router();
const controller = new TicketController();

router.use(authenticate);

router.get('/', controller.findAll.bind(controller));
router.get('/:id', controller.findById.bind(controller));
router.post('/', validateCreateTicket, controller.create.bind(controller));
router.patch('/:id', authorize('admin', 'technician'), validateUpdateTicket, controller.update.bind(controller));
router.patch('/:id/assign', authorize('admin'), validateAssignTicket, controller.assign.bind(controller));
router.patch('/:id/priority', authorize('admin'), validatePriority, controller.setPriority.bind(controller));
router.patch('/:id/status', authorize('admin', 'technician'), validateStatus, controller.changeStatus.bind(controller));
router.post('/:id/follow-ups', authorize('admin', 'technician'), validateFollowUp, controller.addFollowUp.bind(controller));
router.patch('/:id/resolve', authorize('admin', 'technician'), validateSolution, controller.resolve.bind(controller));
router.patch('/:id/close', authorize('admin'), validateCloseTicket, controller.close.bind(controller));
router.delete('/:id', authorize('admin'), controller.delete.bind(controller));
router.post('/:id/comments', validateComment, controller.addComment.bind(controller));

export default router;
