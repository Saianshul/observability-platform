import pool from '../config/db.js';

export const findAllLogs = async (options = {}) => {
    let query = `
        SELECT * 
        FROM server_logs
    `;
    const values = [];

    if (options.startDate && options.endDate) {
        query += ` WHERE timestamp >= $1 AND timestamp <= $2 `;
        values.push(options.startDate, options.endDate + ' 23:59:59');
    }

    query += ` ORDER BY timestamp DESC;`;

    const result = await pool.query(query, values);

    return result.rows;
}

export const findLogsBySession = async (sessionId) => {
    const query = `
        SELECT * 
        FROM server_logs
        WHERE session_id = $1
        ORDER BY timestamp DESC;
    `;
    const values = [sessionId];
    const result = await pool.query(query, values);

    return result.rows;
}

export const findLogsByStatusRange = async (minStatus, maxStatus) => {
    const query = `
        SELECT * 
        FROM server_logs
        WHERE status_code >= $1 AND status_code < $2
        ORDER BY timestamp DESC;
    `;
    const values = [minStatus, maxStatus];
    const result = await pool.query(query, values);

    return result.rows;
}
