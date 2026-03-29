import bcrypt from 'bcrypt';
import pool from './config/db.js';

async function setupDatabase() {
    try {
        console.log('Creating browser_telemetry table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS browser_telemetry (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255),
                session_id VARCHAR(255),
                event_type VARCHAR(255),
                url TEXT,
                payload JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Creating server_logs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS server_logs (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(255),
                timestamp TIMESTAMP WITH TIME ZONE,
                HTTP_method VARCHAR(20),
                path TEXT,
                protocol VARCHAR(20),
                status_code INTEGER,
                bytes_sent INTEGER,
                request_serving_time_microseconds INTEGER,
                referer TEXT,
                user_agent TEXT,
                accept_language TEXT,
                sec_ch_ua TEXT,
                platform VARCHAR(255),
                mobile VARCHAR(255),
                model VARCHAR(255),
                form_factors VARCHAR(255),
                user_id VARCHAR(255),
                session_id VARCHAR(255)
            );
        `);

        console.log('Creating users table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                permissions JSONB
            );
        `);

        console.log('Creating reports table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(255) NOT NULL,
                comment TEXT,
                file_path VARCHAR(255) NOT NULL,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Checking for default super_admin...');
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPassword = process.env.ADMIN_PASSWORD;

        const res = await pool.query("SELECT * FROM users WHERE username = $1", [adminUsername]);
        if (res.rows.length === 0) {
            const hash = await bcrypt.hash(adminPassword, 10);
            await pool.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
                [adminUsername, hash, 'super_admin']
            );
            console.log(`Default super_admin created (${adminUsername}).`);
        } else {
            console.log(`Default super_admin (${adminUsername}) already exists.`);
        }

    } catch (err) {
        console.error('Error setting up database:', err.message);
    } finally {
        process.exit();
    }
}

setupDatabase();
