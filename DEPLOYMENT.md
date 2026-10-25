# Hướng Dẫn Triển Khai & Vận Hành Hệ Thống HUIT DRL

Tài liệu hướng dẫn triển khai ứng dụng **HUIT Điểm Rèn Luyện** (Web & Mobile Android) theo chuẩn Quyết định số 3385/QĐ-DCT của Trường Đại học Công Thương TP.HCM.

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

- **Node.js**: Phiên bản 18.x, 20.x hoặc 22.x+ (Khuyến nghị LTS).
- **PostgreSQL**: Neon Serverless PostgreSQL (hoặc bất kỳ PostgreSQL 15+).
- **Android Studio** (Dành cho việc đóng gói file `.apk` / `.aab` cài đặt trên điện thoại).

---

## 2. Cấu Hình Biến Môi Trường (Environment Variables)

Tạo tệp `.env.local` tại thư mục gốc với các biến sau:

```env
# Kết nối Neon Role giới hạn quyền ứng dụng (SELECT, INSERT, UPDATE, DELETE - KHÔNG CÓ QUYỀN DROP/ALTER)
DATABASE_URL="postgresql://drl_app_user:PASSWORD@ep-xxx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Kết nối DB Owner chỉ dùng cho migration DDL và seed dữ liệu ban đầu
DATABASE_URL_OWNER="postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Khóa bí mật ký JWT Session (tối thiểu 32 ký tự ngẫu nhiên)
AUTH_SECRET="f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8"

# Môi trường chạy
NODE_ENV="production"
```

---

## 3. Khởi Tạo Cơ Sở Dữ Liệu & Seed 65 Tiêu Chí Chuẩn

Chạy các script khởi tạo và nạp toàn bộ 65 tiêu chí quy định từ QĐ 3385:

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy migration schema
python scripts/setup-db-security.py
python scripts/migrate-evidence-url.py

# 3. Seed 65 tiêu chí chuẩn QĐ 3385
python scripts/seed-presets.py
```

---

## 4. Triển Khai Web Lên Vercel

Dự án đã có sẵn cấu hình [`vercel.json`](vercel.json) với đầy đủ Security Headers (CSP, X-Frame-Options, X-Content-Type-Options).

1. Đẩy mã nguồn lên kho lưu trữ GitHub / GitLab (Private repository).
2. Truy cập [vercel.com](https://vercel.com) &rarr; **Add New Project** &rarr; Chọn repository `HUIT-DRL`.
3. Cấu hình các biến môi trường:
   - `DATABASE_URL`
   - `AUTH_SECRET`
4. Bấm **Deploy**. Vercel sẽ tự động build và cấp phát domain HTTPS miễn phí.

---

## 5. Đóng Gói Ứng Dụng Mobile Android (.APK)

Dự án sử dụng Capacitor 6 native:

```bash
# 1. Build ứng dụng web
npm run build

# 2. Đồng bộ sang Android
npx cap sync android

# 3. Mở mã nguồn trong Android Studio
npm run cap:open:android
```

Trong **Android Studio**:
- Vào menu **Build** &rarr; **Build Bundle(s) / APK(s)** &rarr; **Build APK(s)**.
- File APK đầu ra nằm tại: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Copy file APK này vào điện thoại Android để cài đặt và sử dụng ngay lập tức!

---

## 6. Kiểm Thử & Giám Sát Sức Khỏe Hệ Thống

Chạy toàn bộ bộ kiểm thử tự động trước khi bàn giao:

```bash
# Kiểm tra phân quyền an toàn & Auth username
node tests/auth-and-drl.test.js

# Kiểm tra công thức 60 điểm sàn & chặn trần từng tiêu chí
python scripts/test-business-logic.py

# Kiểm tra toàn bộ 36 kịch bản E2E API
node tests/e2e-api.test.js
```

Kiểm tra endpoint giám sát hệ thống thời gian thực:
```bash
curl https://your-domain.vercel.app/api/health
```
Kết quả trả về:
```json
{
  "status": "ok",
  "uptimeSeconds": 1240,
  "timestamp": "2026-10-26T01:40:00.000Z",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "latencyMs": 24,
    "engine": "Neon Serverless PostgreSQL"
  }
}
```
