require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
    console.log('🌱 Initializing PostgreSQL...');
    await db.initDatabase();
    
    console.log('🧹 Clearing existing data...');
    await db.exec(`
        TRUNCATE TABLE order_items, orders, cart_items, wishlist, reviews, products, 
            categories, brands, news, contacts, newsletter, coupons, users RESTART IDENTITY CASCADE;
    `);
    
    console.log('🌱 Seeding data...');
    
    // ===== USERS =====
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@quangmobile.vn';
    const adminPwd = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
    const userPwd = bcrypt.hashSync('User@123', 10);
    
    await db.prepare(`INSERT INTO users (email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?)`).run(
        adminEmail, adminPwd, 'Quản trị viên', '0123456789', 'admin'
    );
    await db.prepare(`INSERT INTO users (email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?)`).run(
        'user@example.com', userPwd, 'Nguyễn Văn An', '0987654321', 'user'
    );
    
    // ===== CATEGORIES =====
    const categories = [
        { name: 'Điện thoại', slug: 'dien-thoai', icon: 'fa-mobile-alt', sort_order: 1 },
        { name: 'Ốp lưng', slug: 'op-lung', icon: 'fa-shield-alt', sort_order: 2 },
        { name: 'Sạc & Cáp', slug: 'sac-cap', icon: 'fa-bolt', sort_order: 3 },
        { name: 'Tai nghe', slug: 'tai-nghe', icon: 'fa-headphones', sort_order: 4 },
        { name: 'Cường lực', slug: 'cuong-luc', icon: 'fa-mobile-screen', sort_order: 5 },
        { name: 'Pin dự phòng', slug: 'pin-du-phong', icon: 'fa-battery-full', sort_order: 6 }
    ];
    const insertCategory = db.prepare(`INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)`);
    for (const c of categories) {
        await insertCategory.run(c.name, c.slug, c.icon, c.sort_order);
    }
    
    // ===== BRANDS =====
    const brands = ['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Realme', 'Sony', 'Anker'];
    const insertBrand = db.prepare(`INSERT INTO brands (name, slug) VALUES (?, ?)`);
    for (const b of brands) {
        await insertBrand.run(b, b.toLowerCase().replace(/\s+/g, '-'));
    }
    
    // ===== PRODUCTS =====
    const products = [
        {
            name: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max-256gb',
            short_description: 'Flagship cao cấp nhất từ Apple với chip A17 Pro, camera periscope zoom 5x',
            description: 'iPhone 15 Pro Max là chiếc smartphone cao cấp nhất của Apple với khung Titanium siêu nhẹ, chip A17 Pro 3nm mạnh mẽ, hệ thống camera đỉnh cao với khả năng zoom quang học 5x.',
            price: 29990000, old_price: 34990000, stock: 25, sold: 128,
            image: 'images/phone1.svg', category_id: 1, brand_id: 1,
            badge: 'Hot', featured: 1,
            specs: JSON.stringify({
                'Màn hình': '6.7" Super Retina XDR', 'Chip': 'Apple A17 Pro',
                'RAM': '8GB', 'Bộ nhớ': '256GB',
                'Camera': '48MP + 12MP + 12MP', 'Pin': '4422 mAh'
            })
        },
        {
            name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra',
            short_description: 'Smartphone Android hàng đầu với Galaxy AI và bút S Pen tích hợp',
            description: 'Galaxy S24 Ultra mang đến sức mạnh AI vượt trội với Galaxy AI, camera 200MP siêu nét, zoom quang 10x.',
            price: 27990000, old_price: 32990000, stock: 18, sold: 95,
            image: 'images/phone2.svg', category_id: 1, brand_id: 2,
            badge: '-15%', featured: 1
        },
        {
            name: 'Xiaomi 14 Ultra 512GB', slug: 'xiaomi-14-ultra-512gb',
            short_description: 'Camera Leica chuyên nghiệp, hiệu năng đỉnh cao với Snapdragon 8 Gen 3',
            description: 'Xiaomi 14 Ultra hợp tác với Leica mang đến trải nghiệm nhiếp ảnh đỉnh cao.',
            price: 19990000, old_price: 22990000, stock: 30, sold: 67,
            image: 'images/phone3.svg', category_id: 1, brand_id: 3,
            badge: 'Mới', featured: 1
        },
        {
            name: 'OPPO Find X7 Ultra', slug: 'oppo-find-x7-ultra',
            short_description: 'Camera Hasselblad, sạc nhanh 100W, thiết kế đẳng cấp',
            description: 'OPPO Find X7 Ultra với hệ thống camera kép Hasselblad zoom periscope.',
            price: 22990000, old_price: 25990000, stock: 15, sold: 42,
            image: 'images/phone4.svg', category_id: 1, brand_id: 4
        },
        {
            name: 'AirPods Pro 2 USB-C', slug: 'airpods-pro-2-usbc',
            short_description: 'Chống ồn chủ động, âm thanh không gian, sạc USB-C',
            description: 'AirPods Pro 2 phiên bản USB-C với chip H2, chống ồn chủ động đỉnh cao.',
            price: 5490000, old_price: 6199000, stock: 50, sold: 203,
            image: 'images/accessory1.svg', category_id: 4, brand_id: 1, featured: 1
        },
        {
            name: 'Anker PowerCore 20000mAh', slug: 'anker-powercore-20000',
            short_description: 'Pin dự phòng 20000mAh, sạc nhanh PD 65W',
            description: 'Pin dự phòng Anker dung lượng 20000mAh, hỗ trợ sạc nhanh Power Delivery 65W.',
            price: 790000, old_price: 990000, stock: 100, sold: 156,
            image: 'images/accessory2.svg', category_id: 6, brand_id: 8, badge: '-20%'
        },
        {
            name: 'Cáp USB-C Anker 100W', slug: 'cap-usbc-anker-100w',
            short_description: 'Cáp sạc nhanh USB-C to USB-C, công suất 100W, dài 1.8m',
            description: 'Cáp sạc Anker chuẩn USB-C to USB-C công suất 100W.',
            price: 250000, old_price: 350000, stock: 200, sold: 89,
            image: 'images/accessory3.svg', category_id: 3, brand_id: 8
        },
        {
            name: 'Ốp lưng MagSafe iPhone 15', slug: 'op-lung-magsafe-iphone-15',
            short_description: 'Ốp lưng silicon hỗ trợ MagSafe, bảo vệ tốt, nhiều màu sắc',
            description: 'Ốp lưng silicon cao cấp hỗ trợ chuẩn MagSafe.',
            price: 450000, old_price: 590000, stock: 80, sold: 74,
            image: 'images/accessory4.svg', category_id: 2, brand_id: 1, badge: 'Mới'
        }
    ];
    
    const insertProduct = db.prepare(`
        INSERT INTO products (name, slug, description, short_description, price, old_price, stock, sold, image, category_id, brand_id, specs, badge, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of products) {
        await insertProduct.run(
            p.name, p.slug, p.description, p.short_description,
            p.price, p.old_price || null, p.stock, p.sold,
            p.image, p.category_id, p.brand_id, p.specs || null,
            p.badge || null, p.featured || 0
        );
    }
    
    // ===== REVIEWS =====
    const reviews = [
        { product_id: 1, user_name: 'Nguyễn Văn An', rating: 5, comment: 'Sản phẩm tuyệt vời, đóng gói cẩn thận, giao hàng nhanh!' },
        { product_id: 1, user_name: 'Trần Thị Hoa', rating: 5, comment: 'Chính hãng, dùng rất mượt, camera đẹp.' },
        { product_id: 1, user_name: 'Lê Minh Quân', rating: 4, comment: 'Hài lòng, giá hơi cao nhưng xứng đáng.' },
        { product_id: 2, user_name: 'Phạm Thu Hương', rating: 5, comment: 'Galaxy AI rất hay, S Pen tiện dụng.' },
        { product_id: 2, user_name: 'Hoàng Văn Bình', rating: 5, comment: 'Camera zoom 100x ấn tượng!' },
        { product_id: 5, user_name: 'Đặng Quốc Tuấn', rating: 5, comment: 'Chống ồn cực tốt, âm thanh rõ ràng.' }
    ];
    const insertReview = db.prepare(`INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)`);
    for (const r of reviews) {
        await insertReview.run(r.product_id, r.user_name, r.rating, r.comment);
    }
    
    // ===== NEWS =====
    const newsList = [
        {
            title: 'iPhone 16 Pro Max - Những tính năng đáng mong đợi nhất',
            slug: 'iphone-16-pro-max-tinh-nang-mong-doi',
            excerpt: 'Apple dự kiến ra mắt iPhone 16 Pro Max với nhiều cải tiến vượt trội...',
            content: 'Apple dự kiến ra mắt iPhone 16 Pro Max với nhiều cải tiến vượt trội. Từ chip A18 Pro mạnh mẽ, camera periscope zoom quang 10x, đến màn hình ProMotion 240Hz.',
            image: 'images/news1.svg', category: 'Điện thoại', tags: 'iphone,apple,flagship', featured: 1, views: 1234
        },
        {
            title: 'Top 5 tai nghe true wireless đáng mua nhất 2026',
            slug: 'top-5-tai-nghe-tws-2026',
            excerpt: 'Cùng Quang Mobile điểm qua những mẫu tai nghe không dây tốt nhất...',
            content: 'Thị trường tai nghe không dây ngày càng phong phú với nhiều lựa chọn từ bình dân đến cao cấp.',
            image: 'images/news2.svg', category: 'Phụ kiện', tags: 'tai-nghe,airpods,sony', views: 856
        },
        {
            title: '10 mẹo bảo vệ điện thoại hiệu quả trong mùa mưa',
            slug: 'meo-bao-ve-dien-thoai-mua-mua',
            excerpt: 'Thời tiết mưa ẩm có thể gây hại cho điện thoại...',
            content: 'Mùa mưa đến, điện thoại của bạn đối mặt với nhiều nguy cơ từ nước và độ ẩm.',
            image: 'images/news3.svg', category: 'Mẹo hay', tags: 'mua-mua,bao-ve,meo-hay', views: 2145
        },
        {
            title: 'So sánh công nghệ sạc nhanh: USB PD vs QC 5.0 vs VOOC',
            slug: 'so-sanh-sac-nhanh-pd-qc-vooc',
            excerpt: 'Bài viết giúp bạn hiểu rõ sự khác biệt giữa các chuẩn sạc nhanh...',
            content: 'Công nghệ sạc nhanh đang phát triển với tốc độ chóng mặt.',
            image: 'images/news4.svg', category: 'So sánh', tags: 'sac-nhanh,usb-pd,vooc', views: 1542
        },
        {
            title: 'AI trên smartphone 2026: Từ Galaxy AI đến Apple Intelligence',
            slug: 'ai-tren-smartphone-2026',
            excerpt: 'Trí tuệ nhân tạo đang thay đổi cách chúng ta sử dụng điện thoại...',
            content: 'Trí tuệ nhân tạo đang thay đổi cách chúng ta sử dụng điện thoại.',
            image: 'images/news5.svg', category: 'AI & Mobile', tags: 'ai,galaxy-ai,apple-intelligence', featured: 1, views: 3421
        }
    ];
    const insertNews = db.prepare(`
        INSERT INTO news (title, slug, excerpt, content, image, category, tags, featured, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const n of newsList) {
        await insertNews.run(
            n.title, n.slug, n.excerpt, n.content, n.image, n.category, n.tags,
            n.featured || 0, n.views || 0
        );
    }
    
    // ===== COUPONS =====
    const coupons = [
        { code: 'WELCOME10', type: 'percent', value: 10, min_order: 500000, max_discount: 500000 },
        { code: 'SAVE50K', type: 'amount', value: 50000, min_order: 1000000 },
        { code: 'FREESHIP', type: 'amount', value: 30000, min_order: 0 },
        { code: 'SUMMER20', type: 'percent', value: 20, min_order: 2000000, max_discount: 2000000 }
    ];
    const insertCoupon = db.prepare(`
        INSERT INTO coupons (code, type, value, min_order, max_discount)
        VALUES (?, ?, ?, ?, ?)
    `);
    for (const c of coupons) {
        await insertCoupon.run(c.code, c.type, c.value, c.min_order, c.max_discount || null);
    }
    
    console.log('✅ Database seeded successfully!');
    console.log(`👤 Admin: ${adminEmail} / ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
    console.log(`👤 User:  user@example.com / User@123`);
    console.log(`📦 ${products.length} products, ${categories.length} categories, ${brands.length} brands`);
    console.log(`📰 ${newsList.length} news, ${coupons.length} coupons`);
    
    await db.close();
}

seed().catch(err => {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
});
