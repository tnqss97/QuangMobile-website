const express = require('express');
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function parseProduct(p) {
    if (!p) return null;
    if (p.specs && typeof p.specs === 'string') {
        try { p.specs = JSON.parse(p.specs); } catch (e) {}
    }
    if (p.images && typeof p.images === 'string') {
        try { p.images = JSON.parse(p.images); } catch (e) { p.images = []; }
    }
    // Ensure numeric fields
    p.price = parseInt(p.price) || 0;
    p.old_price = p.old_price ? parseInt(p.old_price) : null;
    p.stock = parseInt(p.stock) || 0;
    p.sold = parseInt(p.sold) || 0;
    p.views = parseInt(p.views) || 0;
    p.avg_rating = p.avg_rating ? parseFloat(p.avg_rating) : 0;
    p.review_count = parseInt(p.review_count) || 0;
    p.featured = parseInt(p.featured) || 0;
    return p;
}

function slugify(str) {
    return String(str).toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// GET /api/products - list products with filters
router.get('/', async (req, res, next) => {
    try {
        const {
            category, brand, search, min_price, max_price,
            sort = 'newest', page = 1, limit = 12, featured
        } = req.query;
        
        let query = `
            SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name,
                   (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status='approved') AS avg_rating,
                   (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status='approved') AS review_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.status = 'active'
        `;
        const params = [];
        
        if (category) {
            query += ` AND c.slug = ?`;
            params.push(category);
        }
        if (brand) {
            query += ` AND b.slug = ?`;
            params.push(brand);
        }
        if (search) {
            query += ` AND (p.name ILIKE ? OR p.description ILIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (min_price) {
            query += ` AND p.price >= ?`;
            params.push(parseInt(min_price));
        }
        if (max_price) {
            query += ` AND p.price <= ?`;
            params.push(parseInt(max_price));
        }
        if (featured === '1' || featured === 'true') {
            query += ` AND p.featured = 1`;
        }
        
        // Count total
        const countQuery = query.replace(/SELECT p\.\*[\s\S]*?FROM products p/, 'SELECT COUNT(*) AS total FROM products p');
        const countRow = await db.prepare(countQuery).get(...params);
        const total = parseInt(countRow.total);
        
        // Sorting
        const sortMap = {
            newest: 'p.created_at DESC',
            oldest: 'p.created_at ASC',
            price_asc: 'p.price ASC',
            price_desc: 'p.price DESC',
            bestseller: 'p.sold DESC',
            rating: 'avg_rating DESC NULLS LAST'
        };
        query += ` ORDER BY ${sortMap[sort] || sortMap.newest}`;
        
        // Pagination
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 12;
        const offset = (pageNum - 1) * limitNum;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);
        
        const rows = await db.prepare(query).all(...params);
        const products = rows.map(parseProduct);
        
        res.json({
            success: true,
            data: products,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                total_pages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) { next(err); }
});

// GET /api/products/search-suggestions?q=...
router.get('/search-suggestions', async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 2) {
            return res.json({ success: true, data: [] });
        }
        
        const products = await db.prepare(`
            SELECT id, name, slug, image, price, old_price, category_id,
                   (SELECT c.name FROM categories c WHERE c.id = p.category_id) AS category_name
            FROM products p
            WHERE p.status = 'active' AND (p.name ILIKE ? OR p.short_description ILIKE ?)
            ORDER BY p.sold DESC
            LIMIT 6
        `).all(`%${q}%`, `%${q}%`);
        
        products.forEach(p => {
            p.price = parseInt(p.price) || 0;
            p.old_price = p.old_price ? parseInt(p.old_price) : null;
        });
        
        res.json({ success: true, data: products });
    } catch (err) { next(err); }
});

// GET /api/products/featured
router.get('/featured', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 4;
        const products = (await db.prepare(`
            SELECT p.*, c.name AS category_name,
                   (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) AS avg_rating,
                   (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS review_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.featured = 1 AND p.status = 'active'
            ORDER BY p.sold DESC
            LIMIT ?
        `).all(limit)).map(parseProduct);
        res.json({ success: true, data: products });
    } catch (err) { next(err); }
});

// GET /api/products/:slug (or :id)
router.get('/:slug', async (req, res, next) => {
    try {
        const slugOrId = req.params.slug;
        const isNumeric = /^\d+$/.test(slugOrId);
        
        const product = await db.prepare(`
            SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name,
                   (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) AS avg_rating,
                   (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS review_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE ${isNumeric ? 'p.id = ?' : 'p.slug = ?'}
        `).get(isNumeric ? parseInt(slugOrId) : slugOrId);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }
        
        // Hide inactive products from public view
        if (product.status !== 'active' && !req.headers.authorization) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }
        
        // Increment views (only for active products)
        if (product.status === 'active') {
            await db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(product.id);
        }
        
        // Get related products
        const related = (await db.prepare(`
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.id != ? AND p.status = 'active'
            ORDER BY p.sold DESC LIMIT 4
        `).all(product.category_id, product.id)).map(parseProduct);
        
        // Get reviews
        const reviews = await db.prepare(`
            SELECT * FROM reviews WHERE product_id = ? AND status = 'approved'
            ORDER BY created_at DESC LIMIT 10
        `).all(product.id);
        
        res.json({
            success: true,
            data: parseProduct(product),
            related,
            reviews
        });
    } catch (err) { next(err); }
});

// POST /api/products (admin)
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const {
            name, slug, description, short_description, price, old_price,
            stock, image, category_id, brand_id, badge, featured, specs, status
        } = req.body;
        
        if (!name || !price) {
            return res.status(400).json({ success: false, message: 'Tên và giá là bắt buộc' });
        }
        
        let productSlug = slug || slugify(name);
        
        // Make slug unique
        let uniqueSlug = productSlug;
        let counter = 1;
        while (await db.prepare('SELECT id FROM products WHERE slug = ?').get(uniqueSlug)) {
            uniqueSlug = `${productSlug}-${counter}`;
            counter++;
        }
        
        const result = await db.prepare(`
            INSERT INTO products (name, slug, description, short_description, price, old_price,
                stock, image, category_id, brand_id, badge, featured, specs, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, uniqueSlug, description || null, short_description || null,
            parseInt(price), old_price ? parseInt(old_price) : null,
            parseInt(stock) || 0, image || null,
            category_id ? parseInt(category_id) : null,
            brand_id ? parseInt(brand_id) : null,
            badge || null, featured ? 1 : 0,
            specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : null,
            status || 'active');
        
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ success: true, message: 'Đã thêm sản phẩm', data: parseProduct(product) });
    } catch (err) { next(err); }
});

// PUT /api/products/:id (admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { name, description, short_description, price, old_price, stock, image, 
                category_id, brand_id, badge, featured, status, specs } = req.body;
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        
        const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        
        await db.prepare(`
            UPDATE products SET name=?, description=?, short_description=?, price=?, old_price=?, 
                stock=?, image=?, category_id=?, brand_id=?, badge=?, featured=?, status=?, specs=?, 
                updated_at=CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            name || existing.name,
            description !== undefined ? description : existing.description,
            short_description !== undefined ? short_description : existing.short_description,
            price ? parseInt(price) : existing.price,
            old_price !== undefined ? (old_price ? parseInt(old_price) : null) : existing.old_price,
            stock !== undefined ? parseInt(stock) : existing.stock,
            image !== undefined ? image : existing.image,
            category_id !== undefined ? (category_id ? parseInt(category_id) : null) : existing.category_id,
            brand_id !== undefined ? (brand_id ? parseInt(brand_id) : null) : existing.brand_id,
            badge !== undefined ? badge : existing.badge,
            featured !== undefined ? (featured ? 1 : 0) : existing.featured,
            status || existing.status,
            specs !== undefined ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : existing.specs,
            id
        );
        
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        res.json({ success: true, message: 'Đã cập nhật', data: parseProduct(product) });
    } catch (err) { next(err); }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        
        const result = await db.prepare('DELETE FROM products WHERE id = ?').run(id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        }
        res.json({ success: true, message: 'Đã xóa' });
    } catch (err) { next(err); }
});

module.exports = router;
