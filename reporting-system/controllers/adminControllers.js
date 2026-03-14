import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findAdminByUsername } from '../models/adminModel.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const admin = await findAdminByUsername(username);

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '1d' });

        res.cookie('jwt', token, {
            httpOnly: true,
            maxAge: 86400000,
            secure: true
        });
        res.status(200).json({ message: 'Logged in successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const logout = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1 });
    res.redirect('/login');
}
