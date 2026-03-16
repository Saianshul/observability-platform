import bcrypt from 'bcrypt';
import pool from './config/db.js';

async function setupDatabase() {
    try {
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
        const res = await pool.query("SELECT * FROM users WHERE username = 'admin'");
        if (res.rows.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
                ['admin', hash, 'super_admin']
            );
            console.log('Default super_admin created (admin / admin123).');
        } else {
            console.log('Default super_admin already exists.');
        }

    } catch (err) {
        console.error('Error setting up database:', err.message);
    } finally {
        process.exit();
    }
}

setupDatabase();
