import express from 'express';
import { 
    getPerformanceData, 
    getBehavioralData, 
    getAudienceData, 
    getErrorData,
    createSavedReport,
    getSavedReports,
    deleteSavedReport
} from '../controllers/reportControllers.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

router.use(authenticate);

router.get('/saved', getSavedReports);

router.get('/performance', requireRole(['super_admin', 'analyst']), getPerformanceData);
router.get('/behavioral', requireRole(['super_admin', 'analyst']), getBehavioralData);
router.get('/audience', requireRole(['super_admin', 'analyst']), getAudienceData);
router.get('/errors', requireRole(['super_admin', 'analyst']), getErrorData);

router.post('/saved', requireRole(['super_admin', 'analyst']), createSavedReport);

router.delete('/saved/:id', requireRole(['super_admin', 'analyst']), deleteSavedReport);

export default router;
