const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const { category, search, page = 1, limit = 6, featured } = req.query;
        let query = `SELECT * FROM news WHERE status = 'published'`;
        const params = [];
        
        if (category) {
            query += ` AND category = ?`;
            params.push(category);
        }
        if (search) {
            query += ` AND (title ILIKE ? OR content ILIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (featured === '1') {
            query += ` AND featured = 1`;
        }
        
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) AS total');
        const countRow = await db.prepare(countQuery).get(...params);
        const total = parseInt(countRow.total);
        
        query += ` ORDER BY featured DESC, created_at DESC LIMIT ? OFFSET ?`;
        const limitNum = parseInt(limit);
        const offset = (parseInt(page) - 1) * limitNum;
        params.push(limitNum, offset);
        
        const news = await db.prepare(query).all(...params);
        
        res.json({
            success: true,
            data: news,
            pagination: { page: parseInt(page), limit: limitNum, total, total_pages: Math.ceil(total / limitNum) }
        });
    } catch (err) { next(err); }
});

router.get('/popular', async (req, res, next) => {
    try {
        const news = await db.prepare(`
            SELECT id, title, slug, image, category, views, created_at
            FROM news WHERE status = 'published'
            ORDER BY views DESC LIMIT 5
        `).all();
        res.json({ success: true, data: news });
    } catch (err) { next(err); }
});

router.get('/categories', async (req, res, next) => {
    try {
        const categories = await db.prepare(`
            SELECT category AS name, COUNT(*) AS count
            FROM news WHERE status = 'published' AND category IS NOT NULL
            GROUP BY category ORDER BY count DESC
        `).all();
        res.json({ success: true, data: categories });
    } catch (err) { next(err); }
});

router.get('/tags', async (req, res, next) => {
    try {
        const allTags = await db.prepare(`SELECT tags FROM news WHERE tags IS NOT NULL`).all();
        const tagSet = new Set();
        allTags.forEach(row => {
            (row.tags || '').split(',').forEach(t => {
                const tag = t.trim();
                if (tag) tagSet.add(tag);
            });
        });
        res.json({ success: true, data: Array.from(tagSet) });
    } catch (err) { next(err); }
});

router.get('/:slug', async (req, res, next) => {
    try {
        const article = await db.prepare(`SELECT * FROM news WHERE slug = ? AND status = 'published'`).get(req.params.slug);
        if (!article) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });
        
        await db.prepare('UPDATE news SET views = views + 1 WHERE id = ?').run(article.id);
        
        const related = await db.prepare(`
            SELECT id, title, slug, excerpt, image, category, created_at
            FROM news WHERE category = ? AND id != ? AND status = 'published'
            ORDER BY created_at DESC LIMIT 3
        `).all(article.category, article.id);
        
        res.json({ success: true, data: article, related });
    } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { title, slug, excerpt, content, image, category, tags, featured, status } = req.body;
        if (!title || !slug || !content) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
        }
        
        const result = await db.prepare(`
            INSERT INTO news (title, slug, excerpt, content, image, category, tags, featured, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(title, slug, excerpt, content, image, category, tags,
            featured ? 1 : 0, status || 'published');
        
        const article = await db.prepare('SELECT * FROM news WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ success: true, data: article });
    } catch (err) { next(err); }
});

// DELETE /api/news/:id (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        
        const result = await db.prepare('DELETE FROM news WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        }
        res.json({ success: true, message: 'Đã xóa bài viết' });
    } catch (err) { next(err); }
});

module.exports = router;
