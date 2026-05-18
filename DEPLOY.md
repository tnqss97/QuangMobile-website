# 🚀 Hướng dẫn Deploy

Kiến trúc deploy:
- **Database**: Neon (đã setup) - PostgreSQL cloud miễn phí
- **Backend**: Render.com - Node.js API server miễn phí  
- **Frontend**: Vercel.com - HTML/CSS/JS static hosting miễn phí

```
[User] → [Vercel: Frontend] → [Render: Backend API] → [Neon: PostgreSQL]
```

---

## 📦 Bước 0: Push code lên GitHub

Nếu chưa có repo Git, làm như sau:

```bash
cd d:\QuangMobile Website
git init
git add .
git commit -m "Initial commit"
```

Sau đó:
1. Truy cập **https://github.com/new**
2. Tạo repo mới (đặt tên `quangmobile-website` chẳng hạn)
3. **KHÔNG** tick "Add README" hay ".gitignore" (mình đã có rồi)
4. Sau khi tạo xong, copy link repo và chạy:

```bash
git remote add origin https://github.com/YOUR_USERNAME/quangmobile-website.git
git branch -M main
git push -u origin main
```

> ⚠️ File `.env` đã được .gitignore bảo vệ, password DB sẽ KHÔNG bị push lên GitHub.

---

## 🟢 Bước 1: Deploy Backend lên Render.com

### 1.1. Tạo tài khoản Render

1. Truy cập **https://render.com**
2. Click **"Get Started"** → đăng nhập bằng GitHub (cho phép Render đọc repos)

### 1.2. Tạo Web Service

1. Trong Dashboard, click **"+ New"** → **"Web Service"**
2. Click **"Connect"** vào repo `quangmobile-website`
3. Render tự đọc file `backend/render.yaml` hoặc bạn điền thủ công:

| Trường | Giá trị |
|--------|---------|
| **Name** | `quangmobile-backend` |
| **Region** | `Singapore` |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

### 1.3. Cấu hình biến môi trường (Environment Variables)

Cuộn xuống mục **"Environment"** → **"Add Environment Variable"**, nhập từng biến:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DB_SSL` | `true` |
| `DATABASE_URL` | *(paste connection string Neon - giống trong file `.env` local)* |
| `JWT_SECRET` | *(chuỗi random ít nhất 32 ký tự)* |
| `JWT_EXPIRES` | `7d` |
| `ADMIN_EMAIL` | `admin@quangmobile.vn` |
| `ADMIN_PASSWORD` | `Admin@123` |
| `ALLOWED_ORIGINS` | *(để trống lúc này, sẽ điền sau khi deploy Vercel xong)* |

Cách tạo `JWT_SECRET` random: vào https://www.uuidgenerator.net/ copy UUID, hoặc gõ trong PowerShell:
```powershell
[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()
```

### 1.4. Click "Create Web Service"

Render bắt đầu build. Sau 2-5 phút sẽ có URL kiểu:
```
https://quangmobile-backend.onrender.com
```

### 1.5. Chạy seed data lên database

Trong Render dashboard, mở tab **"Shell"** của service vừa tạo → chạy:
```bash
npm run seed
```

> ⚠️ Lưu ý: Nếu đã seed local rồi (data đã có trên Neon) thì **KHÔNG cần** chạy lại - tránh xoá data hiện có.

### 1.6. Test backend

Mở trình duyệt: `https://quangmobile-backend.onrender.com/api/health`

Nếu thấy `{"success":true,"message":"API is running",...}` → backend OK ✅

> 💡 **Cold start**: Render free tier sleep sau 15 phút không có request. Lần truy cập đầu tiên sau khi sleep sẽ chậm 30-60 giây. Sau đó hoạt động bình thường.

---

## ⚪ Bước 2: Cập nhật Frontend với URL Backend

Mở file `js/config.js` (trên máy local), tìm dòng:

```js
const PROD_API_URL = 'https://quangmobile-backend.onrender.com/api';
```

Thay bằng URL Render thực tế của bạn (giữ `/api` ở cuối).

Commit + push:
```bash
git add js/config.js
git commit -m "Update production API URL"
git push
```

---

## 🔵 Bước 3: Deploy Frontend lên Vercel.com

### 3.1. Tạo tài khoản Vercel

1. Truy cập **https://vercel.com**
2. Click **"Sign Up"** → đăng nhập bằng GitHub

### 3.2. Import Project

1. Trong Dashboard → click **"Add New..."** → **"Project"**
2. Tìm repo `quangmobile-website` → click **"Import"**

### 3.3. Cấu hình

Vercel tự đọc file `vercel.json`. Bạn chỉ cần để ý:

| Trường | Giá trị |
|--------|---------|
| **Project Name** | `quangmobile` (hoặc tên bạn muốn) |
| **Framework Preset** | `Other` (vì là static HTML) |
| **Root Directory** | `./` (mặc định) |
| **Build Command** | *(để trống)* |
| **Output Directory** | *(để trống)* |
| **Install Command** | *(để trống)* |

### 3.4. Click "Deploy"

Vercel build trong ~30 giây. Khi xong sẽ có URL kiểu:
```
https://quangmobile.vercel.app
```

### 3.5. Test frontend

Mở URL Vercel - bạn sẽ thấy trang chủ. Mở DevTools (F12) → tab **Network** → reload trang → kiểm tra xem có call đến `quangmobile-backend.onrender.com/api/...` thành công không.

---

## 🔗 Bước 4: Cho phép Vercel gọi Render Backend (CORS)

Quay lại Render Dashboard → service `quangmobile-backend` → tab **"Environment"**:

Sửa biến `ALLOWED_ORIGINS`, điền URL Vercel của bạn:
```
https://quangmobile.vercel.app
```

Nếu có nhiều domain (custom domain, preview URLs...) thì phân cách bằng dấu phẩy:
```
https://quangmobile.vercel.app,https://*.vercel.app,https://yourdomain.com
```

> Render sẽ tự động restart service sau khi đổi env var (~1 phút).

---

## ✅ Hoàn tất - Test cuối cùng

1. Mở `https://quangmobile.vercel.app`
2. Đăng nhập admin: `admin@quangmobile.vn` / `Admin@123`
3. Vào trang Quản trị → thử thêm sản phẩm
4. Mở chế độ ẩn danh → đăng ký user mới → mua hàng → checkout → đặt đơn

---

## 🔄 Quy trình deploy sau này

Mỗi khi sửa code trên máy local:

```bash
git add .
git commit -m "Mô tả thay đổi"
git push
```

- Render sẽ tự động re-build backend (vài phút)
- Vercel sẽ tự động re-build frontend (vài chục giây)

---

## 🐛 Troubleshooting

### "Failed to fetch" trên Vercel
- Kiểm tra `js/config.js` đã update đúng URL Render chưa
- Kiểm tra `ALLOWED_ORIGINS` trên Render có URL Vercel chưa
- Mở DevTools Console xem lỗi cụ thể

### "Cannot connect to database" trên Render
- Kiểm tra `DATABASE_URL` đúng format không
- Đảm bảo `DB_SSL=true`
- Vào Neon dashboard xem database có online không

### Render service bị "Failed"
- Vào tab "Logs" xem lỗi chi tiết
- Phổ biến nhất: thiếu env var hoặc sai connection string

### Trang admin trắng / lỗi 401
- Đảm bảo đã đăng nhập trước khi vào `/admin`
- Login với tài khoản role admin

---

## 💰 Chi phí

Tất cả đều miễn phí cho dự án nhỏ:
- **Neon free**: 0.5GB storage
- **Render free**: 750 giờ/tháng (1 service chạy ~24/7), sleep sau 15 phút idle
- **Vercel free (Hobby)**: 100GB bandwidth/tháng, unlimited deploys

Đủ cho dự án portfolio + vài trăm user/ngày.
