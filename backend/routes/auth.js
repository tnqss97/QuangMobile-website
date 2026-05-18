const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function issueToken(user) {
    return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function sanitizeUser(user) {
    const { password, ...rest } = user;
    return rest;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, full_name, phone } = req.body;
        if (!email || !password || !full_name) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }
        
        const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email đã được đăng ký' });
        }
        
        const hashed = bcrypt.hashSync(password, 10);
        const result = await db.prepare(`
            INSERT INTO users (email, password, full_name, phone, role)
            VALUES (?, ?, ?, ?, 'user')
        `).run(email, hashed, full_name, phone || null);
        
        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        const token = issueToken(user);
        
        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            token,
            user: sanitizeUser(user)
        });
    } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
        }
        
        const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }
        
        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }
        
        const token = issueToken(user);
        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: sanitizeUser(user)
        });
    } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
});

// PUT /api/auth/me
router.put('/me', authenticate, async (req, res, next) => {
    try {
        const { full_name, phone, address, avatar } = req.body;
        await db.prepare(`
            UPDATE users SET full_name = ?, phone = ?, address = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            full_name || req.user.full_name,
            phone || req.user.phone,
            address || req.user.address,
            avatar || req.user.avatar,
            req.user.id
        );
        const user = await db.prepare('SELECT id, email, full_name, phone, address, role, avatar FROM users WHERE id = ?').get(req.user.id);
        res.json({ success: true, message: 'Cập nhật thành công', user });
    } catch (err) { next(err); }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }
        
        const user = await db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
        if (!bcrypt.compareSync(current_password, user.password)) {
            return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
        }
        
        const hashed = bcrypt.hashSync(new_password, 10);
        await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
        res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (err) { next(err); }
});

module.exports = router;
