const express = require('express');
const db = require('../database/db');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');

const router = express.Router();

function generateOrderCode() {
    const date = new Date();
    const ymd = date.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `QM${ymd}${rand}`;
}

// POST /api/orders - create order
router.post('/', optionalAuth, async (req, res, next) => {
    try {
        const {
            customer_name, customer_phone, customer_email, shipping_address,
            note, items, payment_method = 'cod', coupon_code
        } = req.body;
        
        if (!customer_name || !customer_phone || !shipping_address) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin giao hàng' });
        }
        
        let orderItems = items;
        
        // If user logged in and no items provided, use cart
        if (req.user && (!items || items.length === 0)) {
            orderItems = await db.prepare(`
                SELECT ci.product_id, ci.quantity, p.name AS product_name, p.image AS product_image, p.price, p.stock
                FROM cart_items ci JOIN products p ON ci.product_id = p.id
                WHERE ci.user_id = ?
            `).all(req.user.id);
        }
        
        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }
        
        // Calculate totals
        let subtotal = 0;
        const processedItems = [];
        
        for (const item of orderItems) {
            const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
            if (!product) {
                return res.status(400).json({ success: false, message: `Sản phẩm không tồn tại` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `${product.name}: chỉ còn ${product.stock} sản phẩm` });
            }
            const price = parseInt(product.price);
            const itemSubtotal = price * item.quantity;
            subtotal += itemSubtotal;
            processedItems.push({
                product_id: product.id,
                product_name: product.name,
                product_image: product.image,
                price: price,
                quantity: item.quantity,
                subtotal: itemSubtotal
            });
        }
        
        const shipping_fee = subtotal >= 500000 ? 0 : 30000;
        let discount = 0;
        let validCoupon = null;
        
        // Apply coupon
        if (coupon_code) {
            const coupon = await db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(coupon_code);
            if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
                subtotal >= parseInt(coupon.min_order) && (!coupon.usage_limit || coupon.used_count < coupon.usage_limit)) {
                if (coupon.type === 'percent') {
                    discount = Math.floor(subtotal * parseInt(coupon.value) / 100);
                    if (coupon.max_discount) discount = Math.min(discount, parseInt(coupon.max_discount));
                } else {
                    discount = parseInt(coupon.value);
                }
                validCoupon = coupon;
            }
        }
        
        const total = subtotal + shipping_fee - discount;
        const order_code = generateOrderCode();
        
        // Insert order in transaction
        const tx = db.transaction(async (txDb) => {
            const orderResult = await txDb.prepare(`
                INSERT INTO orders (order_code, user_id, customer_name, customer_phone, customer_email,
                    shipping_address, note, subtotal, shipping_fee, total, payment_method)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                order_code, req.user?.id || null, customer_name, customer_phone,
                customer_email || null, shipping_address, note || null,
                subtotal, shipping_fee, total, payment_method
            );
            
            const orderId = orderResult.lastInsertRowid;
            const insertItem = txDb.prepare(`
                INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const updateStock = txDb.prepare('UPDATE products SET stock = stock - ?, sold = sold + ? WHERE id = ?');
            
            for (const item of processedItems) {
                await insertItem.run(orderId, item.product_id, item.product_name, item.product_image,
                    item.price, item.quantity, item.subtotal);
                await updateStock.run(item.quantity, item.quantity, item.product_id);
            }
            
            // Update coupon
            if (validCoupon) {
                await txDb.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(validCoupon.id);
            }
            
            // Clear cart if user logged in
            if (req.user) {
                await txDb.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
            }
            
            return orderId;
        });
        
        const orderId = await tx();
        const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItemsData = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
        
        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công',
            data: { ...order, items: orderItemsData, discount }
        });
    } catch (err) { next(err); }
});

// GET /api/orders - user's orders
router.get('/', authenticate, async (req, res, next) => {
    try {
        const orders = await db.prepare(`
            SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
        `).all(req.user.id);
        
        const orderItemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
        for (const o of orders) {
            o.items = await orderItemsStmt.all(o.id);
        }
        
        res.json({ success: true, data: orders });
    } catch (err) { next(err); }
});

// GET /api/orders/:code
router.get('/:code', optionalAuth, async (req, res, next) => {
    try {
        const order = await db.prepare('SELECT * FROM orders WHERE order_code = ?').get(req.params.code);
        if (!order) return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        
        if (order.user_id && req.user?.id !== order.user_id && req.user?.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền' });
        }
        
        order.items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        res.json({ success: true, data: order });
    } catch (err) { next(err); }
});

// PUT /api/orders/:id/status (admin)
router.put('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
        if (!valid.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }
        
        await db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(status, req.params.id);
        res.json({ success: true, message: 'Đã cập nhật trạng thái' });
    } catch (err) { next(err); }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res, next) => {
    try {
        const order = await db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
            .get(req.params.id, req.user.id);
        if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        if (order.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn hàng đang chờ xử lý' });
        }
        
        const tx = db.transaction(async (txDb) => {
            await txDb.prepare('UPDATE orders SET status = ? WHERE id = ?').run('cancelled', req.params.id);
            const items = await txDb.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
            const restoreStmt = txDb.prepare('UPDATE products SET stock = stock + ?, sold = sold - ? WHERE id = ?');
            for (const i of items) {
                if (i.product_id) await restoreStmt.run(i.quantity, i.quantity, i.product_id);
            }
        });
        await tx();
        
        res.json({ success: true, message: 'Đã hủy đơn hàng' });
    } catch (err) { next(err); }
});

module.exports = router;
