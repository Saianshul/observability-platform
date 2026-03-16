import pool from '../config/db.js';

export const findUserByUsername = async (username) => {
    const query = `
        SELECT * 
        FROM users 
        WHERE username = $1;
    `;
    const values = [username];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const findAllUsers = async () => {
    const query = `
        SELECT id, username, role, permissions 
        FROM users
        ORDER BY id ASC;
    `;
    const result = await pool.query(query);

    return result.rows;
}

export const createUser = async (username, passwordHash, role, permissions) => {
    const query = `
        INSERT INTO users (username, password_hash, role, permissions) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, username, role, permissions;
    `;
    const values = [username, passwordHash, role, permissions ? JSON.stringify(permissions) : null];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const updateUser = async (id, role, permissions) => {
    const query = `
        UPDATE users 
        SET role = $1, permissions = $2 
        WHERE id = $3 
        RETURNING id, username, role, permissions;
    `;
    const values = [role, permissions ? JSON.stringify(permissions) : null, id];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const updatePassword = async (id, passwordHash) => {
    const query = `
        UPDATE users 
        SET password_hash = $1
        WHERE id = $2 
        RETURNING id, username;
    `;
    const values = [passwordHash, id];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const deleteUserById = async (id) => {
    const query = `
        DELETE 
        FROM users 
        WHERE id = $1 
        RETURNING id, username;
    `;
    const values = [id];
    const result = await pool.query(query, values);

    return result.rows[0];
}
