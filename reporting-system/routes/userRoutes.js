import express from 'express';
import { 
    login, 
    logout, 
    getAllUsers, 
    createNewUser, 
    updateExistingUser, 
    deleteUser, 
    resetPassword 
} from '../controllers/userControllers.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

router.post('/login', login);
router.get('/logout', logout);

router.use(authenticate);
router.use(requireRole(['super_admin']));

router.get('/', getAllUsers);
router.post('/', createNewUser);
router.put('/:id', updateExistingUser);
router.put('/:id/password', resetPassword);
router.delete('/:id', deleteUser);

export default router;
