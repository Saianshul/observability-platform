import express from 'express';
import { 
    getAllEvents, 
    getEvent, 
    createNewEvent, 
    updateExistingEvent, 
    deleteEvent 
} from '../controllers/eventControllers.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllEvents);
router.get('/:id', getEvent);
router.post('/', createNewEvent);
router.put('/:id', updateExistingEvent);
router.delete('/:id', deleteEvent);

export default router;
