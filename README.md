# HUIT.DRL — Sổ Tay Rèn Luyện Sinh Viên HUIT

> Hệ thống quản lý, theo dõi và dự báo điểm rèn luyện cá nhân dành cho sinh viên Trường Đại học Công Thương TP.HCM (HUIT) theo quy chuẩn **Quyết định số 3385/QĐ-DCT**.

[![HUIT DRL CI](https://github.com/nicodolas/HUIT-DRL/actions/workflows/ci.yml/badge.svg)](https://github.com/nicodolas/HUIT-DRL/actions/workflows/ci.yml)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/Database-Neon%20Postgres-00e599?logo=postgresql)](https://neon.tech/)

---

## 🌟 Tính Năng Nổi Bật

- **Quy chuẩn 65 Tiêu chuẩn QĐ 3385**: Tự động nhận diện, phân loại và cảnh báo trần điểm (TC1: 25đ, TC2: 20đ, TC3: 20đ, TC4: 15đ, TC5: 20đ).
- **Phân loại Thông minh bằng Ngôn ngữ Tự nhiên (Smart Classifier)**: Gợi ý tức thì tiêu chuẩn quy chế khi sinh viên nhập tên hoạt động.
- **Biểu đồ Radar 5 Trụ cột**: Trực quan hóa mức độ phát triển toàn diện và tính toán chỉ số cân bằng rèn luyện.
- **Kho Ảnh Minh Chứng (Proof Vault)**: Nén ảnh thông minh trước khi tải lên, kiểm tra tính hợp lệ minh chứng trước khi nộp.
- **Mô phỏng "What-If" & Dự báo Học bổng**: Giả lập các hoạt động dự kiến để đạt mục tiêu Xuất sắc/Tốt và dự báo điều kiện học bổng KKHT.
- **Dự báo Tốt nghiệp (Điều 12)**: Tính toán điểm trung bình toàn khóa và cảnh báo điều kiện tốt nghiệp.
- **Chế độ Sáng / Tối Cao cấp (Theme Engine)**: Giao diện tối ưu thị giác, không chớp trắng, lưu trữ trạng thái mượt mà.
- **Phân quyền Nghiêm ngặt (RBAC)**: Tách biệt hoàn toàn cổng quản trị viên (`/admin`) và sổ tay cá nhân của sinh viên.
- **Đa nền tảng (Web & Android)**: Hỗ trợ chạy mượt mà trên trình duyệt và ứng dụng Android (Capacitor).

---

## 🚀 Bắt Đầu Nhanh (Quick Start)

### 1. Cài đặt Dependencies
```bash
git clone https://github.com/nicodolas/HUIT-DRL.git
cd HUIT-DRL
npm install
```

### 2. Cấu hình Môi trường
Sao chép `.env.example` thành `.env.local`:
```bash
cp .env.example .env.local
```
Điền chuỗi kết nối cơ sở dữ liệu Neon của bạn vào `DATABASE_URL` và `DATABASE_URL_OWNER`.

### 3. Khởi tạo Cơ sở dữ liệu & Nạp dữ liệu chuẩn
```bash
# Đẩy lược đồ bảng
npm run db:push

# Nạp 65 tiêu chí quy chế QĐ 3385 và học kỳ chính quy
npm run db:seed
```

### 4. Khởi động Máy chủ Phát triển
```bash
npm run dev
```
Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

---

## 🤝 Đóng Góp & Phát Triển (Contributing)

Xem chi tiết quy trình tạo nhánh, kiểm thử và mở Pull Request tại [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📄 Bản Quyền & Giấy Phép

Phát triển phục vụ cộng đồng sinh viên Trường Đại học Công Thương TP.HCM (HUIT).
Mọi quyền sở hữu trí tuệ thuộc về nhóm phát triển.

