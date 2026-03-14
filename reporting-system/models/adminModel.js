import pool from '../config/db.js';

export const findAdminByUsername = async (username) => {
    const query = `
        SELECT * 
        FROM admins 
        WHERE username = $1;
    `;
    const values = [username];
    const result = await pool.query(query, values);

    return result.rows[0];
}
