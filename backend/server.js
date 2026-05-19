require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const db = require('./database/db');

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const newsRoutes = require('./routes/news');
const miscRoutes = require('./routes/misc');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow no-origin (mobile apps, Postman) or whitelisted origins
        if (!origin) return callback(null, true);
        // In dev or when no whitelist, allow all
        if (process.env.NODE_ENV !== 'production' || allowedOrigins.length === 0) {
            return callback(null, true);
        }
        // Check whitelist (supports wildcard subdomains like *.vercel.app)
        const ok = allowedOrigins.some(allowed => {
            if (allowed === origin) return true;
            if (allowed.startsWith('*.')) {
                const suffix = allowed.slice(1);
                return origin.endsWith(suffix);
            }
            return false;
        });
        callback(ok ? null : new Error('Not allowed by CORS'), ok);
    },
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiter for API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }
});
app.use('/api/', apiLimiter);

// More strict for auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Quá nhiều lần thử, vui lòng thử lại sau' }
});

// ===== SERVE FRONTEND =====
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Track request start time
app.use((req, res, next) => { req._startTime = Date.now(); next(); });

// ===== API ROUTES =====
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

app.get('/api/health/db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW() AS time, version() AS version');
        res.json({
            success: true,
            message: 'Database is alive',
            db_time: result.rows[0].time,
            version: result.rows[0].version.split(' ').slice(0, 2).join(' '),
            response_ms: Date.now() - req._startTime
        });
    } catch (err) {
        res.status(503).json({
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/news', newsRoutes);
app.use('/api', miscRoutes);

// ===== FRONTEND ROUTING =====
const frontendPages = ['index', 'products', 'product', 'news', 'article', 'contact',
    'login', 'register', 'cart', 'checkout', 'account', 'orders', 'admin'];

frontendPages.forEach(page => {
    app.get('/' + page, (req, res) => {
        res.sendFile(path.join(frontendPath, page + '.html'));
    });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Lỗi server',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===== TEMPORARY SEED ENDPOINT (xóa sau khi dùng xong) =====
app.get('/api/run-seed-31011989', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        
        // Clear all data
        await db.exec(`
            TRUNCATE TABLE order_items, orders, cart_items, wishlist, reviews, products, 
                categories, brands, news, contacts, newsletter, coupons, users RESTART IDENTITY CASCADE;
        `);
        
        // Create admin
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@quangmobile.store';
        const adminPwd = bcrypt.hashSync(process.env.ADMIN_PASSWORD || '31011989Aa@', 10);
        await db.prepare(`INSERT INTO users (email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?)`)
            .run(adminEmail, adminPwd, 'Quản trị viên', '0355668897', 'admin');
        
        // Categories
        const cats = [
            ['Điện thoại', 'dien-thoai', 'fa-mobile-alt', 1],
            ['Ốp lưng', 'op-lung', 'fa-shield-alt', 2],
            ['Sạc & Cáp', 'sac-cap', 'fa-bolt', 3],
            ['Tai nghe', 'tai-nghe', 'fa-headphones', 4],
            ['Cường lực', 'cuong-luc', 'fa-mobile-screen', 5],
            ['Pin dự phòng', 'pin-du-phong', 'fa-battery-full', 6]
        ];
        for (const c of cats) {
            await db.prepare('INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)').run(...c);
        }
        
        // Brands
        const brands = ['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Realme', 'Sony', 'Anker'];
        for (const b of brands) {
            await db.prepare('INSERT INTO brands (name, slug) VALUES (?, ?)').run(b, b.toLowerCase());
        }
        
        // Products
        const products = [
            ['iPhone 15 Pro Max 256GB', 'iphone-15-pro-max-256gb', 29990000, 34990000, 25, 128, 'images/phone1.svg', 1, 1, 'Hot', 1],
            ['Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 27990000, 32990000, 18, 95, 'images/phone2.svg', 1, 2, '-15%', 1],
            ['Xiaomi 14 Ultra 512GB', 'xiaomi-14-ultra-512gb', 19990000, 22990000, 30, 67, 'images/phone3.svg', 1, 3, 'Mới', 1],
            ['OPPO Find X7 Ultra', 'oppo-find-x7-ultra', 22990000, 25990000, 15, 42, 'images/phone4.svg', 1, 4, null, 0],
            ['AirPods Pro 2 USB-C', 'airpods-pro-2-usbc', 5490000, 6199000, 50, 203, 'images/accessory1.svg', 4, 1, null, 1],
            ['Anker PowerCore 20000mAh', 'anker-powercore-20000', 790000, 990000, 100, 156, 'images/accessory2.svg', 6, 8, '-20%', 0],
            ['Cáp USB-C Anker 100W', 'cap-usbc-anker-100w', 250000, 350000, 200, 89, 'images/accessory3.svg', 3, 8, null, 0],
            ['Ốp lưng MagSafe iPhone 15', 'op-lung-magsafe-iphone-15', 450000, 590000, 80, 74, 'images/accessory4.svg', 2, 1, 'Mới', 0]
        ];
        for (const p of products) {
            await db.prepare('INSERT INTO products (name, slug, price, old_price, stock, sold, image, category_id, brand_id, badge, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...p);
        }
        
        // Coupons
        const coupons = [
            ['WELCOME10', 'percent', 10, 500000, 500000],
            ['SAVE50K', 'amount', 50000, 1000000, null],
            ['FREESHIP', 'amount', 30000, 0, null],
            ['SUMMER20', 'percent', 20, 2000000, 2000000]
        ];
        for (const c of coupons) {
            await db.prepare('INSERT INTO coupons (code, type, value, min_order, max_discount) VALUES (?, ?, ?, ?, ?)').run(...c);
        }
        
        res.json({ success: true, message: 'Seed completed! Admin: ' + adminEmail });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint không tồn tại' });
});

// ===== START =====
async function start() {
    try {
        await db.initDatabase();
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Quang Mobile Server`);
            console.log(`   Database: PostgreSQL`);
            console.log(`   Frontend: http://localhost:${PORT}`);
            console.log(`   API:      http://localhost:${PORT}/api`);
            console.log(`   Health:   http://localhost:${PORT}/api/health\n`);
        });
    } catch (err) {
        console.error('\n❌ Failed to start server:');
        console.error(err.message);
        console.error('\nLàm theo các bước sau:');
        console.error('1. Cài đặt PostgreSQL: https://www.postgresql.org/download/');
        console.error('2. Tạo database: CREATE DATABASE quangmobile;');
        console.error('3. Kiểm tra lại file backend/.env');
        console.error('4. Chạy: npm run seed\n');
        process.exit(1);
    }
}

start();
