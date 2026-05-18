const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function slugify(str) {
    return String(str).toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ===== BRANDS - MUST BE BEFORE /:id ROUTES =====

router.get('/brands', async (req, res, next) => {
    try {
        const brands = await db.prepare(`
            SELECT b.*, (SELECT COUNT(*) FROM products WHERE brand_id = b.id AND status='active') AS product_count
            FROM brands b ORDER BY b.name
        `).all();
        res.json({ success: true, data: brands });
    } catch (err) { next(err); }
});

router.post('/brands', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { name, logo } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Tên thương hiệu là bắt buộc' });
        
        const result = await db.prepare(`INSERT INTO brands (name, slug, logo) VALUES (?, ?, ?)`)
            .run(name, slugify(name), logo || null);
        const brand = await db.prepare('SELECT * FROM brands WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ success: true, message: 'Đã thêm thương hiệu', data: brand });
    } catch (err) {
        if (/duplicate key|UNIQUE/i.test(err.message)) {
            return res.status(409).json({ success: false, message: 'Thương hiệu đã tồn tại' });
        }
        next(err);
    }
});

router.delete('/brands/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        
        const row = await db.prepare('SELECT COUNT(*) AS c FROM products WHERE brand_id = ?').get(id);
        const count = parseInt(row.c);
        if (count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Thương hiệu này có ${count} sản phẩm. Vui lòng xóa sản phẩm trước.`
            });
        }
        const result = await db.prepare('DELETE FROM brands WHERE id = ?').run(id);
        if (result.changes === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true, message: 'Đã xóa thương hiệu' });
    } catch (err) { next(err); }
});

// ===== CATEGORIES =====

router.get('/', async (req, res, next) => {
    try {
        const categories = await db.prepare(`
            SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND status='active') AS product_count
            FROM categories c ORDER BY c.sort_order, c.name
        `).all();
        res.json({ success: true, data: categories });
    } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { name, icon, description, sort_order } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Tên danh mục là bắt buộc' });
        
        const slug = slugify(name);
        const result = await db.prepare(`
            INSERT INTO categories (name, slug, icon, description, sort_order)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, slug, icon || 'fa-tag', description || null, parseInt(sort_order) || 0);
        
        const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ success: true, message: 'Đã thêm danh mục', data: cat });
    } catch (err) {
        if (/duplicate key|UNIQUE/i.test(err.message)) {
            return res.status(409).json({ success: false, message: 'Tên danh mục đã tồn tại' });
        }
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!cat) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true, data: cat });
    } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { name, icon, description, sort_order } = req.body;
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        
        const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        
        const newName = name || existing.name;
        const newSlug = name ? slugify(name) : existing.slug;
        
        await db.prepare(`
            UPDATE categories SET name = ?, slug = ?, icon = ?, description = ?, sort_order = ?
            WHERE id = ?
        `).run(
            newName, newSlug,
            icon !== undefined ? icon : existing.icon,
            description !== undefined ? description : existing.description,
            sort_order !== undefined ? parseInt(sort_order) : existing.sort_order,
            id
        );
        const cat = await db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        res.json({ success: true, message: 'Đã cập nhật', data: cat });
    } catch (err) {
        if (/duplicate key|UNIQUE/i.test(err.message)) {
            return res.status(409).json({ success: false, message: 'Tên danh mục đã tồn tại' });
        }
        next(err);
    }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        
        const row = await db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?').get(id);
        const count = parseInt(row.c);
        if (count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Danh mục này đang có ${count} sản phẩm. Vui lòng chuyển/xóa sản phẩm trước.`
            });
        }
        
        const result = await db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        }
        res.json({ success: true, message: 'Đã xóa danh mục' });
    } catch (err) { next(err); }
});

module.exports = router;
