const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ===== CONTACT =====
router.post('/contact', async (req, res, next) => {
    try {
        const { name, phone, email, subject, message } = req.body;
        if (!name || !phone || !message) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin' });
        }
        
        await db.prepare(`
            INSERT INTO contacts (name, phone, email, subject, message)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, phone, email || null, subject || null, message);
        
        res.status(201).json({ success: true, message: 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm.' });
    } catch (err) { next(err); }
});

router.get('/contact', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const contacts = await db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
        res.json({ success: true, data: contacts });
    } catch (err) { next(err); }
});

// ===== NEWSLETTER =====
router.post('/newsletter', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
        }
        
        try {
            await db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email);
            res.status(201).json({ success: true, message: 'Đăng ký nhận tin thành công!' });
        } catch (err) {
            if (/duplicate key|UNIQUE/i.test(err.message)) {
                return res.json({ success: true, message: 'Email đã được đăng ký' });
            }
            throw err;
        }
    } catch (err) { next(err); }
});

// ===== COUPONS =====
router.post('/coupons/validate', async (req, res, next) => {
    try {
        const { code, subtotal } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá' });
        
        const coupon = await db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(code);
        if (!coupon) return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại' });
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn' });
        }
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng' });
        }
        if (parseInt(subtotal) < parseInt(coupon.min_order)) {
            return res.status(400).json({
                success: false,
                message: `Đơn hàng tối thiểu ${parseInt(coupon.min_order).toLocaleString('vi-VN')}đ`
            });
        }
        
        let discount = 0;
        if (coupon.type === 'percent') {
            discount = Math.floor(parseInt(subtotal) * parseInt(coupon.value) / 100);
            if (coupon.max_discount) discount = Math.min(discount, parseInt(coupon.max_discount));
        } else {
            discount = parseInt(coupon.value);
        }
        
        res.json({
            success: true,
            message: `Áp dụng mã giảm giá thành công - Giảm ${discount.toLocaleString('vi-VN')}đ`,
            data: { coupon, discount }
        });
    } catch (err) { next(err); }
});

// ===== WISHLIST =====
router.get('/wishlist', authenticate, async (req, res, next) => {
    try {
        const items = await db.prepare(`
            SELECT w.id, p.id AS product_id, p.name, p.slug, p.image, p.price, p.old_price
            FROM wishlist w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `).all(req.user.id);
        items.forEach(i => {
            i.price = parseInt(i.price);
            i.old_price = i.old_price ? parseInt(i.old_price) : null;
        });
        res.json({ success: true, data: items });
    } catch (err) { next(err); }
});

router.post('/wishlist', authenticate, async (req, res, next) => {
    try {
        const { product_id } = req.body;
        if (!product_id) return res.status(400).json({ success: false, message: 'Thiếu sản phẩm' });
        
        try {
            await db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)')
                .run(req.user.id, product_id);
            res.json({ success: true, message: 'Đã thêm vào yêu thích' });
        } catch (err) {
            if (/duplicate key|UNIQUE/i.test(err.message)) {
                return res.json({ success: true, message: 'Sản phẩm đã có trong danh sách yêu thích' });
            }
            throw err;
        }
    } catch (err) { next(err); }
});

router.delete('/wishlist/:productId', authenticate, async (req, res, next) => {
    try {
        const result = await db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?')
            .run(req.user.id, req.params.productId);
        if (result.changes === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true, message: 'Đã xóa khỏi yêu thích' });
    } catch (err) { next(err); }
});

// ===== ADMIN STATS =====
router.get('/admin/stats', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const usersCount = await db.prepare('SELECT COUNT(*) AS c FROM users').get();
        const productsCount = await db.prepare('SELECT COUNT(*) AS c FROM products').get();
        const ordersCount = await db.prepare('SELECT COUNT(*) AS c FROM orders').get();
        const revenueRow = await db.prepare("SELECT SUM(total) AS s FROM orders WHERE status != 'cancelled'").get();
        const pendingRow = await db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'").get();
        const newContactsRow = await db.prepare("SELECT COUNT(*) AS c FROM contacts WHERE status = 'new'").get();
        const subsRow = await db.prepare('SELECT COUNT(*) AS c FROM newsletter WHERE active = 1').get();
        
        const recentOrders = await db.prepare(`
            SELECT id, order_code, customer_name, total, status, created_at
            FROM orders ORDER BY created_at DESC LIMIT 10
        `).all();
        
        const topProducts = await db.prepare(`
            SELECT id, name, image, sold, price FROM products
            WHERE status = 'active' ORDER BY sold DESC LIMIT 5
        `).all();
        
        // Convert numeric fields
        recentOrders.forEach(o => o.total = parseInt(o.total));
        topProducts.forEach(p => p.price = parseInt(p.price));
        
        res.json({
            success: true,
            data: {
                users: parseInt(usersCount.c),
                products: parseInt(productsCount.c),
                orders: parseInt(ordersCount.c),
                revenue: parseInt(revenueRow.s) || 0,
                pending_orders: parseInt(pendingRow.c),
                new_contacts: parseInt(newContactsRow.c),
                newsletter_subs: parseInt(subsRow.c),
                recent_orders: recentOrders,
                top_products: topProducts
            }
        });
    } catch (err) { next(err); }
});

router.get('/admin/orders', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        let query = `SELECT * FROM orders WHERE 1=1`;
        const params = [];
        
        if (status) {
            query += ` AND status = ?`;
            params.push(status);
        }
        if (search) {
            query += ` AND (order_code ILIKE ? OR customer_name ILIKE ? OR customer_phone ILIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        const countQ = query.replace('SELECT *', 'SELECT COUNT(*) AS total');
        const countRow = await db.prepare(countQ).get(...params);
        const total = parseInt(countRow.total);
        
        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
        const orders = await db.prepare(query).all(...params);
        orders.forEach(o => o.total = parseInt(o.total));
        
        res.json({ success: true, data: orders, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) { next(err); }
});

module.exports = router;
