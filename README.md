# Quang Mobile - E-commerce Website

Website thương mại điện tử cho cửa hàng điện thoại và phụ kiện với backend đầy đủ.

## 🚀 Tính năng

### Frontend
- 🏠 Trang chủ với fullpage scroll mượt mà
- 📱 Trang sản phẩm với bộ lọc, tìm kiếm, sắp xếp
- 🛒 Giỏ hàng với mã giảm giá
- 💳 Thanh toán nhiều phương thức (COD, ngân hàng, MoMo)
- 👤 Tài khoản: profile, đơn hàng, yêu thích, đổi mật khẩu
- 📰 Tin tức công nghệ
- 📞 Liên hệ với form và FAQ
- 🔍 Theo dõi đơn hàng (cho cả khách lẻ)
- 🛠️ Trang quản trị admin

### Backend
- 🔐 JWT Authentication
- 📦 SQLite database (không cần cài đặt server)
- 🛍️ Quản lý sản phẩm, danh mục, thương hiệu
- 🛒 Giỏ hàng, đơn hàng, mã giảm giá
- ⭐ Đánh giá sản phẩm
- 📰 Quản lý tin tức
- 📧 Newsletter, contact form
- 👥 Phân quyền user/admin
- 🔄 RESTful API

## 📁 Cấu trúc

```
QuangMobile Website/
├── backend/              # Backend API server
│   ├── database/         # SQLite database & seed
│   ├── middleware/       # Auth middleware
│   ├── routes/           # API routes
│   ├── server.js         # Entry point
│   └── package.json
├── css/                  # Stylesheets
├── images/               # SVG illustrations
├── js/                   # Frontend JavaScript
├── index.html            # Trang chủ
├── products.html         # Trang sản phẩm
├── product.html          # Chi tiết sản phẩm
├── news.html             # Tin tức
├── contact.html          # Liên hệ
├── login.html            # Đăng nhập
├── register.html         # Đăng ký
├── cart.html             # Giỏ hàng
├── checkout.html         # Thanh toán
├── account.html          # Tài khoản
├── orders.html           # Theo dõi đơn hàng
└── admin.html            # Quản trị
```

## 🛠️ Cài đặt

### Yêu cầu
- Node.js 18+ 
- npm

### Bước 1: Cài đặt dependencies

```bash
cd backend
npm install
```

### Bước 2: Khởi tạo dữ liệu mẫu

```bash
npm run seed
```

### Bước 3: Chạy server

```bash
npm start
```

Hoặc dùng dev mode (auto-reload):

```bash
npm run dev
```

### Bước 4: Mở website

Truy cập http://localhost:3000

## 👤 Tài khoản demo

**Admin:**
- Email: `admin@quangmobile.vn`
- Password: `Admin@123`

**User:**
- Email: `user@example.com`  
- Password: `User@123`

## 🎟️ Mã giảm giá test

- `WELCOME10` - Giảm 10% (đơn từ 500k, tối đa 500k)
- `SAVE50K` - Giảm 50.000đ (đơn từ 1tr)
- `FREESHIP` - Giảm 30.000đ (free ship)
- `SUMMER20` - Giảm 20% (đơn từ 2tr, tối đa 2tr)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Thông tin user hiện tại
- `PUT /api/auth/me` - Cập nhật profile
- `PUT /api/auth/password` - Đổi mật khẩu

### Products
- `GET /api/products` - Danh sách (filter, sort, paginate)
- `GET /api/products/featured` - Sản phẩm nổi bật
- `GET /api/products/:slug` - Chi tiết
- `POST /api/products` (admin) - Thêm sản phẩm
- `PUT /api/products/:id` (admin) - Cập nhật
- `DELETE /api/products/:id` (admin) - Xóa

### Cart
- `GET /api/cart` - Lấy giỏ hàng
- `POST /api/cart` - Thêm vào giỏ
- `PUT /api/cart/:id` - Cập nhật số lượng
- `DELETE /api/cart/:id` - Xóa item
- `DELETE /api/cart` - Xóa toàn bộ

### Orders
- `POST /api/orders` - Tạo đơn hàng
- `GET /api/orders` - Lịch sử đơn hàng
- `GET /api/orders/:code` - Chi tiết đơn
- `POST /api/orders/:id/cancel` - Hủy đơn
- `PUT /api/orders/:id/status` (admin) - Cập nhật trạng thái

### Reviews
- `GET /api/reviews/:productId` - Đánh giá của sản phẩm
- `POST /api/reviews` - Thêm đánh giá

### News
- `GET /api/news` - Danh sách bài viết
- `GET /api/news/popular` - Phổ biến
- `GET /api/news/categories` - Chuyên mục
- `GET /api/news/tags` - Tags
- `GET /api/news/:slug` - Chi tiết

### Misc
- `POST /api/contact` - Gửi liên hệ
- `POST /api/newsletter` - Đăng ký nhận tin
- `POST /api/coupons/validate` - Kiểm tra mã giảm giá
- `GET/POST/DELETE /api/wishlist` - Yêu thích
- `GET /api/admin/stats` (admin) - Thống kê

## 🎨 Công nghệ

**Frontend:** HTML5, CSS3, Vanilla JavaScript (không framework)
**Backend:** Node.js, Express.js
**Database:** SQLite (better-sqlite3)
**Auth:** JWT, bcrypt

## 📄 License

MIT
