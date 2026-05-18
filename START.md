# 🚀 Hướng dẫn khởi động (PostgreSQL)

## Bước 1: Cài đặt PostgreSQL

Có 3 cách chọn 1:

### Cách A: Dùng Docker (KHUYẾN NGHỊ - đơn giản nhất)

```bash
# Trong thư mục backend
cd backend
docker compose up -d
```

Postgres sẽ chạy ở `localhost:5432` với user/pass `postgres/postgres`.

### Cách B: Cài đặt PostgreSQL native (Windows)

1. Tải tại: https://www.postgresql.org/download/windows/
2. Cài đặt với mật khẩu user `postgres` là `postgres` (hoặc tự đổi rồi sửa file `.env`)
3. Mở pgAdmin hoặc psql, tạo database:
   ```sql
   CREATE DATABASE quangmobile;
   ```

### Cách C: Dùng Postgres cloud miễn phí

Đăng ký tại https://neon.tech hoặc https://supabase.com (free tier).
Lấy connection string, sửa file `backend/.env`:
```
DATABASE_URL=postgresql://user:pass@your-host.neon.tech/quangmobile
DB_SSL=true
```

## Bước 2: Cài đặt Node packages

```bash
cd backend
npm install
```

## Bước 3: Khởi tạo dữ liệu mẫu (chỉ chạy lần đầu)

```bash
npm run seed
```

Lệnh này sẽ:
- Tạo schema (tables)
- Insert 8 sản phẩm, 6 danh mục, 8 thương hiệu
- Tạo 2 tài khoản (admin & user)
- Tạo 5 bài tin tức và 4 mã giảm giá

## Bước 4: Chạy server

```bash
npm start
```

Mở trình duyệt: http://localhost:3000

---

## 🔐 Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@quangmobile.vn | Admin@123 |
| User | user@example.com | User@123 |

## 🎟️ Mã giảm giá

| Mã | Loại | Điều kiện |
|----|------|-----------|
| WELCOME10 | -10% | Đơn từ 500k, tối đa giảm 500k |
| SAVE50K | -50.000đ | Đơn từ 1tr |
| FREESHIP | -30.000đ | Đơn nào cũng được |
| SUMMER20 | -20% | Đơn từ 2tr, tối đa giảm 2tr |

## 🌐 Deploy lên public

### Render.com (free tier có database PostgreSQL miễn phí)

1. Tạo repo Git, push code lên GitHub
2. Vào https://dashboard.render.com → "New +" → "Web Service"
3. Connect GitHub repo
4. Cấu hình:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Tạo PostgreSQL database trong Render → copy "Internal Database URL"
6. Vào "Environment" của Web Service, thêm biến môi trường:
   - `DATABASE_URL` = Internal Database URL
   - `JWT_SECRET` = chuỗi random
   - `DB_SSL` = `true`
   - `NODE_ENV` = `production`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (tuỳ ý)
7. Sau khi deploy xong, vào Shell tab và chạy: `npm run seed`

### Railway / Fly.io / Vercel (tương tự)

Code đã sẵn sàng:
- Hỗ trợ `DATABASE_URL` connection string (chuẩn cloud)
- Tự động bật SSL khi `NODE_ENV=production` hoặc `DB_SSL=true`
- Frontend được serve cùng backend

## 🛠️ Lệnh hữu ích

```bash
npm start           # Chạy server
npm run dev         # Chạy với auto-reload
npm run seed        # Khởi tạo lại data (cẩn thận: xóa data cũ)
docker compose up -d   # Khởi động Postgres qua Docker
docker compose down    # Tắt Postgres
docker compose down -v # Tắt và xoá volume (xoá cả data)
```

## 📝 Cấu hình .env

```env
# Cách 1: dùng connection string (cloud)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_SSL=true

# Cách 2: dùng từng biến (local)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=quangmobile
DB_SSL=false
```
