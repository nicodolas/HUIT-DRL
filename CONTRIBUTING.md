# Hướng dẫn Đóng góp & Phát triển Dự án (Contributing Guide)

Chào mừng bạn đến với dự án **HUIT.DRL** — Hệ thống theo dõi & tính điểm rèn luyện sinh viên theo Quyết định số 3385/QĐ-DCT của Trường Đại học Công Thương TP.HCM.

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường phát triển cục bộ, kết nối cơ sở dữ liệu Neon cá nhân và quy trình làm việc chuẩn mực trên Git.

---

## 🚀 1. Chuẩn bị Môi trường (Prerequisites)

- **Node.js**: Phiên bản 20 LTS trở lên (khuyến nghị Node.js 22 LTS).
- **npm**: Phiên bản 10 trở lên.
- **Git**: Đã cài đặt và cấu hình SSH hoặc Personal Access Token trên máy tính.

---

## 🛠️ 2. Thiết lập Dự án & Cơ sở dữ liệu Neon Cá nhân

Dự án sử dụng cơ sở dữ liệu PostgreSQL Serverless lưu trữ trên [Neon](https://neon.tech). Để đảm bảo môi trường phát triển độc lập và an toàn, mỗi thành viên nên sở hữu một cơ sở dữ liệu Neon riêng (hoàn toàn miễn phí):

### Bước 2.1: Clone mã nguồn
```bash
git clone https://github.com/nicodolas/HUIT-DRL.git
cd HUIT-DRL
npm install
```

### Bước 2.2: Tạo Database trên Neon
1. Đăng ký/Đăng nhập tại [https://neon.tech](https://neon.tech).
2. Tạo một **Project mới** (ví dụ: `huit-drl-dev`), chọn khu vực gần bạn nhất (ví dụ: `ap-southeast-1` Singapore).
3. Tại mục **Dashboard -> Connection Details**, sao chép chuỗi kết nối PostgreSQL (dạng `postgresql://...`).

### Bước 2.3: Cấu hình biến môi trường cục bộ
1. Tạo file `.env.local` từ mẫu `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
2. Mở file `.env.local` và dán chuỗi kết nối vừa sao chép từ Neon vào:
   ```env
   DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require"
   DATABASE_URL_OWNER="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require"
   AUTH_SECRET="chuoi-bi-mat-ngau-nhien-it-nhat-32-ky-tu"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

### Bước 2.4: Đẩy lược đồ bảng và nạp dữ liệu mẫu (2 bước)
Chỉ cần chạy 2 lệnh sau trên terminal:
```bash
# 1. Đẩy lược đồ bảng vào Neon
npm run db:push

# 2. Tự động nạp 65 mục quy chế QĐ 3385 và học kỳ chính quy
npm run db:seed
```

### Bước 2.5: Khởi động ứng dụng
```bash
npm run dev
```
Truy cập [http://localhost:3000](http://localhost:3000) trên trình duyệt.

---

## 🌿 3. Quy chuẩn Nhánh & Quy trình Làm việc (Git Workflow)

Nhánh `main` là nhánh chính dùng để phát hành sản phẩm và deploy production. **Không push trực tiếp mã nguồn vào nhánh `main`**.

### Quy trình 4 bước chuẩn:

1. **Cập nhật nhánh `main` mới nhất trước khi làm**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Tạo nhánh làm việc có tiền tố rõ ràng**:
   - Tính năng mới: `feature/<ten-tinh-nang>` (ví dụ: `feature/export-pdf-enhancement`)
   - Sửa lỗi: `fix/<ten-loi>` (ví dụ: `fix/darkmode-contrast`)
   - Tái cấu trúc / Tối ưu: `refactor/<mo-ta>` (ví dụ: `refactor/api-auth-caching`)
   - Tài liệu / Cấu hình: `chore/<mo-ta>` (ví dụ: `chore/update-readme`)

   ```bash
   git checkout -b feature/awesome-feature
   ```

3. **Kiểm tra chất lượng cục bộ trước khi push**:
   ```bash
   # Kiểm tra biên dịch và kiểu dữ liệu
   npm run build
   ```

4. **Tạo Pull Request (PR)**:
   - Push nhánh lên remote: `git push origin feature/awesome-feature`.
   - Mở Pull Request vào nhánh `main` trên GitHub.
   - Điền đầy đủ thông tin theo mẫu PR Template.
   - Chờ hệ thống CI (`GitHub Actions`) hoàn tất kiểm thử tự động với tích xanh ✅ và nhận duyệt từ người phụ trách trước khi Merge.

---

## 🔒 4. Nguyên tắc Bảo mật Dự án

- **Tuyệt đối không commit file chứa thông tin nhạy cảm**: File `.env.local` đã nằm trong `.gitignore` và không bao giờ được đưa lên Git.
- **Không hardcode chuỗi kết nối hay mật khẩu**: Luôn lấy qua `process.env`.
- Mọi thắc mắc và trao đổi kỹ thuật có thể tạo Issue trên GitHub hoặc liên hệ qua kênh trao đổi nội bộ của nhóm.

