import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userModel from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await userModel.findUserByUsername(username);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ 
            id: user.id, 
            username: user.username,
            role: user.role,
            permissions: user.permissions
        }, JWT_SECRET, { expiresIn: '1d' });

        res.cookie('jwt', token, {
            httpOnly: true,
            maxAge: 86400000,
            secure: true
        });
        
        res.status(200).json({ message: 'Logged in successfully', role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const logout = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1 });
    res.redirect('/login');
}

export const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.findAllUsers();
        res.status(200).json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const createNewUser = async (req, res) => {
    try {
        const { username, password, role, permissions } = req.body;
        
        const hash = await bcrypt.hash(password, 10);

        const newUser = await userModel.createUser(username, hash, role, permissions);
        res.status(201).json(newUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const updateExistingUser = async (req, res) => {
    try {
        const { role, permissions } = req.body;
        const updatedUser = await userModel.updateUser(req.params.id, role, permissions);
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User Not Found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        
        const updatedUser = await userModel.updatePassword(req.params.id, hash);
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User Not Found' });
        }

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const deleteUser = async (req, res) => {
    try {
        const deletedUser = await userModel.deleteUserById(req.params.id);

        if (!deletedUser) {
            return res.status(404).json({ error: 'User Not Found' });
        }

        res.status(200).json(deletedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
