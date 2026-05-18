const express = require('express');
const db = require('../database/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:productId', async (req, res, next) => {
    try {
        const reviews = await db.prepare(`
            SELECT * FROM reviews WHERE product_id = ? AND status = 'approved'
            ORDER BY created_at DESC
        `).all(req.params.productId);
        
        const stats = await db.prepare(`
            SELECT 
                AVG(rating) AS avg_rating,
                COUNT(*) AS total,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS five,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS four,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS three,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS two,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS one
            FROM reviews WHERE product_id = ? AND status = 'approved'
        `).get(req.params.productId);
        
        res.json({ success: true, data: reviews, stats });
    } catch (err) { next(err); }
});

router.post('/', optionalAuth, async (req, res, next) => {
    try {
        const { product_id, rating, comment, user_name } = req.body;
        if (!product_id || !rating) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1-5 sao' });
        }
        
        const product = await db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        
        const reviewerName = req.user ? req.user.full_name : (user_name || 'Khách hàng');
        
        await db.prepare(`
            INSERT INTO reviews (product_id, user_id, user_name, rating, comment)
            VALUES (?, ?, ?, ?, ?)
        `).run(product_id, req.user?.id || null, reviewerName, rating, comment || null);
        
        res.status(201).json({ success: true, message: 'Cảm ơn đánh giá của bạn' });
    } catch (err) { next(err); }
});

module.exports = router;
