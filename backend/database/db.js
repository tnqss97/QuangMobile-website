const { Pool } = require('pg');

const useUrl = !!process.env.DATABASE_URL;
const sslEnabled = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

const pool = new Pool(useUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'quangmobile',
        ssl: sslEnabled ? { rejectUnauthorized: false } : false
      }
);

pool.on('error', (err) => {
    console.error('Unexpected DB error:', err);
});

// Convert SQLite-style ? placeholders to PostgreSQL $1, $2...
function convertPlaceholders(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
}

// Compatibility wrapper to provide sync-like API similar to better-sqlite3
// This keeps route code minimal change
const db = {
    pool,
    
    // Async query helper
    async query(sql, params = []) {
        const pgSql = convertPlaceholders(sql);
        const result = await pool.query(pgSql, params);
        return result;
    },
    
    // exec for raw SQL (no params, for schema migrations)
    async exec(sql) {
        return pool.query(sql);
    },
    
    // prepare returns a thenable wrapper - all .run/.get/.all return Promises
    prepare(sql) {
        const pgSql = convertPlaceholders(sql);
        return {
            run: async (...params) => {
                const flatParams = params.flat ? params.flat() : params;
                // For INSERT, append RETURNING id if not present and it's INSERT
                let finalSql = pgSql;
                let needsReturning = /^\s*INSERT\s+/i.test(pgSql) && !/RETURNING/i.test(pgSql);
                if (needsReturning) finalSql = pgSql.replace(/;?\s*$/, '') + ' RETURNING id';
                
                const result = await pool.query(finalSql, flatParams);
                return {
                    lastInsertRowid: result.rows[0]?.id ?? null,
                    changes: result.rowCount
                };
            },
            
            get: async (...params) => {
                const flatParams = params.flat ? params.flat() : params;
                const result = await pool.query(pgSql, flatParams);
                return result.rows[0] || null;
            },
            
            all: async (...params) => {
                const flatParams = params.flat ? params.flat() : params;
                const result = await pool.query(pgSql, flatParams);
                return result.rows;
            }
        };
    },
    
    // Transaction helper - returns async function
    transaction(fn) {
        return async (...args) => {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Create a transaction-scoped db wrapper using the same client
                const txDb = {
                    prepare(sql) {
                        const pgSql = convertPlaceholders(sql);
                        return {
                            run: async (...p) => {
                                const flat = p.flat ? p.flat() : p;
                                let finalSql = pgSql;
                                let needsReturning = /^\s*INSERT\s+/i.test(pgSql) && !/RETURNING/i.test(pgSql);
                                if (needsReturning) finalSql = pgSql.replace(/;?\s*$/, '') + ' RETURNING id';
                                const r = await client.query(finalSql, flat);
                                return { lastInsertRowid: r.rows[0]?.id ?? null, changes: r.rowCount };
                            },
                            get: async (...p) => {
                                const r = await client.query(pgSql, p.flat ? p.flat() : p);
                                return r.rows[0] || null;
                            },
                            all: async (...p) => {
                                const r = await client.query(pgSql, p.flat ? p.flat() : p);
                                return r.rows;
                            }
                        };
                    },
                    exec: async (sql) => client.query(sql)
                };
                
                const result = await fn(txDb, ...args);
                await client.query('COMMIT');
                return result;
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        };
    },
    
    pragma() { /* no-op for postgres */ },
    
    async close() { await pool.end(); }
};

// ===== INITIALIZE SCHEMA =====
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
                avatar TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                icon TEXT,
                description TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS brands (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                logo TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                short_description TEXT,
                price BIGINT NOT NULL,
                old_price BIGINT,
                stock INTEGER DEFAULT 0,
                sold INTEGER DEFAULT 0,
                image TEXT,
                images TEXT,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
                specs TEXT,
                badge TEXT,
                featured INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'out_of_stock')),
                views INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS wishlist (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_code TEXT UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                customer_email TEXT,
                shipping_address TEXT NOT NULL,
                note TEXT,
                subtotal BIGINT NOT NULL,
                shipping_fee BIGINT DEFAULT 0,
                total BIGINT NOT NULL,
                payment_method TEXT DEFAULT 'cod' CHECK(payment_method IN ('cod', 'bank', 'momo')),
                payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed')),
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                product_name TEXT NOT NULL,
                product_image TEXT,
                price BIGINT NOT NULL,
                quantity INTEGER NOT NULL,
                subtotal BIGINT NOT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                user_name TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                comment TEXT,
                status TEXT DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS news (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                excerpt TEXT,
                content TEXT NOT NULL,
                image TEXT,
                category TEXT,
                tags TEXT,
                author TEXT DEFAULT 'Quang Mobile',
                views INTEGER DEFAULT 0,
                featured INTEGER DEFAULT 0,
                status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'published')),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                subject TEXT,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'new' CHECK(status IN ('new', 'read', 'replied')),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS newsletter (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                subscribed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                active INTEGER DEFAULT 1
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                type TEXT DEFAULT 'percent' CHECK(type IN ('percent', 'amount')),
                value BIGINT NOT NULL,
                min_order BIGINT DEFAULT 0,
                max_discount BIGINT,
                usage_limit INTEGER,
                used_count INTEGER DEFAULT 0,
                expires_at TIMESTAMPTZ,
                active INTEGER DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database tables initialized (PostgreSQL)');
    } catch (err) {
        console.error('❌ Database init error:', err.message);
        throw err;
    }
}

// Export init function so server can await it
db.initDatabase = initDatabase;

module.exports = db;
