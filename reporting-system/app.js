import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import { authenticate } from './middleware/authenticate.js';
import { findAllEvents } from './models/eventModel.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.set('view engine', 'ejs');
app.set('views', './views');

const allowedOrigins = ['https://test.saianshulv.site', 'https://reporting.saianshulv.site', 'https://saianshulv.site'];

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

app.use('/admin', adminRoutes);
app.use('/api/events', eventRoutes);

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/', authenticate, async (req, res) => {
    try {
        const allEvents = await findAllEvents();

        res.render('dashboard', {
            admin: req.admin,
            events: allEvents
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading the dashboard data.');
    }
});

app.listen(PORT, () => {
    console.log(`Reporting API listening on port ${PORT}`);
});
