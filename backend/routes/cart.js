const express = require('express');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
    try {
        const items = await db.prepare(`
            SELECT ci.id, ci.quantity, p.id AS product_id, p.name, p.slug, p.image, p.price, p.old_price, p.stock
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
            ORDER BY ci.created_at DESC
        `).all(req.user.id);
        
        items.forEach(i => {
            i.price = parseInt(i.price);
            i.old_price = i.old_price ? parseInt(i.old_price) : null;
        });
        
        const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
        
        res.json({ success: true, data: items, subtotal, total_quantity: totalQuantity });
    } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
    try {
        const { product_id, quantity = 1 } = req.body;
        if (!product_id) return res.status(400).json({ success: false, message: 'Thiếu sản phẩm' });
        
        const product = await db.prepare("SELECT id, stock FROM products WHERE id = ? AND status='active'").get(product_id);
        if (!product) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: `Chỉ còn ${product.stock} sản phẩm trong kho` });
        }
        
        const existing = await db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
            .get(req.user.id, product_id);
        
        if (existing) {
            const newQty = existing.quantity + quantity;
            if (newQty > product.stock) {
                return res.status(400).json({ success: false, message: `Chỉ còn ${product.stock} sản phẩm` });
            }
            await db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
        } else {
            await db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)')
                .run(req.user.id, product_id, quantity);
        }
        
        res.json({ success: true, message: 'Đã thêm vào giỏ hàng' });
    } catch (err) { next(err); }
});

router.put('/:id', authenticate, async (req, res, next) => {
    try {
        const { quantity } = req.body;
        if (!quantity || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ' });
        }
        
        const item = await db.prepare(`
            SELECT ci.*, p.stock FROM cart_items ci 
            JOIN products p ON ci.product_id = p.id 
            WHERE ci.id = ? AND ci.user_id = ?
        `).get(req.params.id, req.user.id);
        
        if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        if (quantity > item.stock) {
            return res.status(400).json({ success: false, message: `Chỉ còn ${item.stock} sản phẩm` });
        }
        
        await db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
        res.json({ success: true, message: 'Đã cập nhật' });
    } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const result = await db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?')
            .run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true, message: 'Đã xóa' });
    } catch (err) { next(err); }
});

router.delete('/', authenticate, async (req, res, next) => {
    try {
        await db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
        res.json({ success: true, message: 'Đã xóa giỏ hàng' });
    } catch (err) { next(err); }
});

module.exports = router;
