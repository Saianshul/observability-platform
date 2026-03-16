import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticate = (req, res, next) => {
    const token = req.cookies.jwt;

    const kickOut = () => {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ error: 'Not authorized. Please log in.' });
        } else {
            return res.redirect('/login');
        }
    }

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
            if (err) {
                console.error(err);
                return kickOut();
            } else {
                req.user = decodedToken;
                next();
            }
        });
    } else {
        return kickOut();
    }
}
