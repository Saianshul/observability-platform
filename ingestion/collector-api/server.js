const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

app.post('/log', async (req, res) => {
    try {
        const userId = req.body.userId || 'unknown';
        const sessionId = req.body.sessionId || 'unknown';
        const eventType = req.body.type || 'unknown';
        const url = req.body.url || 'unknown';
        const payload = req.body;
        
        const query = `
            INSERT INTO browser_telemetry (user_id, session_id, event_type, url, payload)
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *;
        `;
        const values = [userId, sessionId, eventType, url, JSON.stringify(payload)];
        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Collector API listening on port ${PORT}`);
});
