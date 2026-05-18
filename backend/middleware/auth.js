const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.prepare('SELECT id, email, full_name, phone, address, role, avatar FROM users WHERE id = ?').get(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
        }
        next();
    };
}

async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.prepare('SELECT id, email, full_name, phone, address, role FROM users WHERE id = ?').get(decoded.id);
        req.user = user || null;
    } catch (err) {
        req.user = null;
    }
    next();
}

module.exports = { authenticate, authorize, optionalAuth };
