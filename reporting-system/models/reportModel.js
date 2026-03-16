import pool from '../config/db.js';

export const createReport = async (title, category, comment, filePath, createdBy) => {
    const query = `
        INSERT INTO reports (title, category, comment, file_path, created_by) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *;
    `;
    const values = [title, category, comment, filePath, createdBy];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const findAllReports = async () => {
    const query = `
        SELECT r.*, u.username as author_name 
        FROM reports r
        JOIN users u ON r.created_by = u.id
        ORDER BY r.created_at DESC;
    `;
    const result = await pool.query(query);

    return result.rows;
}

export const findReportsByCategory = async (category) => {
    const query = `
        SELECT r.*, u.username as author_name 
        FROM reports r
        JOIN users u ON r.created_by = u.id
        WHERE r.category = $1
        ORDER BY r.created_at DESC;
    `;
    const values = [category];
    const result = await pool.query(query, values);

    return result.rows;
}

export const findReportById = async (id) => {
    const query = `
        SELECT r.*, u.username as author_name 
        FROM reports r
        JOIN users u ON r.created_by = u.id
        WHERE r.id = $1;
    `;
    const values = [id];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const deleteReportById = async (id) => {
    const query = `
        DELETE 
        FROM reports 
        WHERE id = $1 
        RETURNING *;
    `;
    const values = [id];
    const result = await pool.query(query, values);

    return result.rows[0];
}
