import bcrypt from 'bcrypt';
import pool from './config/db.js';

async function createFirstAdmin() {
    const username = 'grader';
    const password = 'C$E135';

    const hash = await bcrypt.hash(password, 10);
    
    try {
        await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [username, hash]);
        console.log(`Admin ${username} created successfully!`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

createFirstAdmin();