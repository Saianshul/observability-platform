import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { authenticate } from './middleware/authenticate.js';
import { requireRole } from './middleware/roles.js';
import { getReportingDashboard } from './controllers/reportControllers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.set('view engine', 'ejs');
app.set('views', './views');

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', reportRoutes);

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/', authenticate, getReportingDashboard);

app.get('/manage-users', authenticate, requireRole(['super_admin']), (req, res) => {
    res.render('user-management', { user: req.user });
});

app.listen(PORT, () => {
    console.log(`Reporting API listening on port ${PORT}`);
});
