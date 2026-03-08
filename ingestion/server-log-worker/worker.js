const { Tail } = require('tail');
const { Pool } = require('pg');
require('dotenv').config();

const LOG_FILE_PATH = process.env.LOG_FILE_PATH;
const logRegex = /^(\S+) \[(.*?)\] "(.*?)" (\d+) (\d+) (\d+) "(.*?)" "(.*?)" "(.*?)" "UA-Hint:(.*?)" "Platform:(.*?)" "Mobile:(.*?)" "Model:(.*?)" "Form-Factors:(.*?)" "User:(.*?)" "Session:(.*?)"$/;
const tail = new Tail(LOG_FILE_PATH);

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

tail.on('line', async (line) => {
    const match = line.match(logRegex);

    if (match) {
        const ip = match[1];

        const rawTimestamp = match[2].replace(':', ' '); 
        const timestamp = new Date(rawTimestamp).toISOString();

        const requestLine = match[3].split(' ');
        const HTTPMethod = requestLine[0] || '-';
        const path = requestLine[1] || '-';
        const protocol = requestLine[2] || '-';

        const statusCode = parseInt(match[4], 10);
        const bytesSent = parseInt(match[5], 10);
        const requestServingTimeMicroseconds = parseInt(match[6], 10);
        const referer = match[7];
        const userAgent = match[8];
        const acceptLanguage = match[9];

        const securityClientHintUserAgent = match[10];
        const platform = match[11];
        const mobile = match[12];
        const model = match[13];
        const formFactors = match[14];
        
        const userId = match[15] === '-' ? null : match[15];
        const sessionId = match[16] === '-' ? null : match[16];
        
        const query = `
            INSERT INTO server_logs (ip, timestamp, HTTP_method, path, protocol, status_code, bytes_sent, request_serving_time_microseconds, referer, user_agent, accept_language, sec_ch_ua, platform, mobile, model, form_factors, user_id, session_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `;
        const values = [ip, timestamp, HTTPMethod, path, protocol, statusCode, bytesSent, requestServingTimeMicroseconds, referer, userAgent, acceptLanguage, securityClientHintUserAgent, platform, mobile, model, formFactors, userId, sessionId];

        try {
            await pool.query(query, values);
            console.log(`Inserted log for user ${userId} with session ${sessionId} and path ${path}`);
        } catch (err) {
            console.error(err);
        }
    } else {
        console.warn('Skipped this line:', line);
    }
});

tail.on('error', err => {
    console.error(err);
});
