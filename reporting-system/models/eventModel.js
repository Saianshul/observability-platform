import pool from '../config/db.js';

export const findAllEvents = async (options = {}) => {
    let query = `
        SELECT * 
        FROM browser_telemetry 
    `;
    const values = [];

    if (options.startDate && options.endDate) {
        query += ` WHERE created_at >= $1 AND created_at <= $2 `;
        values.push(options.startDate, options.endDate + ' 23:59:59');
    }

    query += ` ORDER BY created_at DESC;`;

    const result = await pool.query(query, values);

    return result.rows;
}

export const findEventById = async (id) => {
    const query = `
        SELECT * 
        FROM browser_telemetry 
        WHERE id = $1;
    `;
    const values = [id];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const createEvent = async (userId, sessionId, eventType, url, payload) => {
    const query = `
        INSERT INTO browser_telemetry (user_id, session_id, event_type, url, payload) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *;
    `;
    const values = [userId, sessionId, eventType, url, JSON.stringify(payload)];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const updateEvent = async (id, userId, sessionId, eventType, url, payload) => {
    const query = `
        UPDATE browser_telemetry 
        SET user_id = $1, session_id = $2, event_type = $3, url = $4, payload = $5 
        WHERE id = $6 
        RETURNING *;
    `;
    const values = [userId, sessionId, eventType, url, JSON.stringify(payload), id];
    const result = await pool.query(query, values);

    return result.rows[0];
}

export const deleteEventById = async (id) => {
    const query = `
        DELETE 
        FROM browser_telemetry 
        WHERE id = $1 
        RETURNING *;
    `;
    const values = [id];
    const result = await pool.query(query, values);

    return result.rows[0];
}
