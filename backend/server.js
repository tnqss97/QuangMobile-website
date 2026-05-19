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
const uploadRoutes = require('./routes/upload');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/upload', uploadRoutes);
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
