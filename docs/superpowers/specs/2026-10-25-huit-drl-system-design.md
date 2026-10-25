# System Design: HUIT DRL - Quản lý Điểm Rèn Luyện Cá Nhân

**Ngày lập:** 2026-10-25  
**Quy chế căn cứ:** Quyết định số 3385/QĐ-DCT ngày 12/8/2026 - Trường Đại học Công Thương TP. Hồ Chí Minh (HUIT).  
**Trạng thái:** Đã phê duyệt qua phỏng vấn /grill-me.

---

## 1. Mục tiêu và Phạm vi (Scope)
- **Đối tượng:** Sinh viên Trường Đại học Công Thương TP. Hồ Chí Minh (HUIT).
- **Mục đích:** Giúp sinh viên chủ động tự theo dõi, quản lý, cộng/trừ điểm rèn luyện cá nhân theo từng học kỳ dựa trên quy chế 3385/QĐ-DCT.
- **Nền tảng:**
  - **Web Responsive:** Chạy mượt mà trên desktop và trình duyệt điện thoại.
  - **Android Mobile:** Đóng gói ứng dụng native bằng Capacitor (sinh file APK).
- **Trọng tâm bảo mật:** Neon Serverless PostgreSQL với phân quyền least privilege (tách biệt quyền `owner` và `app_user`), ngăn chặn triệt để nguy cơ khai thác rò rỉ dữ liệu chéo giữa các sinh viên.

---

## 2. Kiến trúc Hệ thống (System Architecture)

### 2.1 Tech Stack
- **Frontend / Fullstack:** Next.js 15 (App Router, React 19, TypeScript).
- **UI / Styling:** Tailwind CSS, shadcn/ui components, Lucide icons, Framer Motion animations.
- **Mobile Packaging:** Capacitor 6+ (hỗ trợ build Android APK).
- **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless` hoặc `pg` pooler).
- **ORM:** Drizzle ORM (type-safe, migrations nhanh, hiệu năng cao).
- **Authentication:** Better-Auth (hoặc JWT/Argon2id session-based auth) - đăng ký/đăng nhập đơn giản với Email/MSSV và mật khẩu.
- **Security:**
  - Database level: Tách vai trò `neondb_owner` (chỉ dùng DDL/migration) và `drl_app_user` (chỉ cấp CRUD trên bảng dữ liệu, không cấp DROP/ALTER).
  - Row isolation: Mọi truy vấn đọc/ghi đều bắt buộc kèm điều kiện `user_id = session.userId`.

---

## 3. Mô hình Dữ liệu (Database Schema)

### 3.1 Bảng `users` (Hồ sơ sinh viên)
- `id` (UUID / text, Primary Key)
- `email` (varchar, unique)
- `password_hash` (text)
- `mssv` (varchar, mã số sinh viên HUIT)
- `full_name` (varchar)
- `faculty` (varchar, khoa)
- `class_name` (varchar, lớp)
- `academic_year` (varchar, khóa học)
- `created_at`, `updated_at` (timestamp)

### 3.2 Bảng `semesters` (Học kỳ rèn luyện)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id` ON DELETE CASCADE)
- `name` (varchar, ví dụ: "Học kỳ 1 - 2025-2026")
- `is_current` (boolean)
- `target_score` (integer, ví dụ 90)
- `target_rating` (varchar, ví dụ "Xuất sắc")
- `discipline_level` (varchar, "none" | "khien_trach" | "canh_cao" | "dinh_chi")
- `created_at`, `updated_at`

### 3.3 Bảng `drl_criteria_presets` (Danh mục tiêu chí chuẩn theo QĐ 3385)
- `id` (serial / text, Primary Key)
- `category` (integer: 1 -> TC1, 2 -> TC2, 3 -> TC3, 4 -> TC4, 5 -> TC5)
- `code` (varchar, ví dụ: "TC1_DEFAULT", "TC1_SHCD", "TC3_HOAT_DONG_TRUONG", ...)
- `title` (text, tên tiêu chí/hoạt động)
- `type` ("default" | "add" | "deduct")
- `points` (numeric, ví dụ: +25, -5, +4, +6)
- `max_points_category` (integer: 25, 20, 20, 15, 20)
- `unit` (varchar: "lần", "HK", "CĐ", "HĐ")

### 3.4 Bảng `drl_records` (Các mục điểm của sinh viên trong từng học kỳ)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`)
- `semester_id` (UUID, Foreign Key -> `semesters.id`)
- `preset_id` (text, nullable - liên kết danh mục chuẩn)
- `category` (integer: 1, 2, 3, 4, 5)
- `title` (text, mô tả hoạt động hoặc vi phạm)
- `points` (numeric, ví dụ: +4, -5)
- `quantity` (integer, số lần/số hoạt động, mặc định 1)
- `occurred_at` (date, ngày diễn ra)
- `note` (text, ghi chú thêm)
- `created_at`, `updated_at`

---

## 4. Thuật toán Tính điểm & Khống chế Trần (Scoring Rules Engine)

Căn cứ Chương II và Chương III Quyết định 3385/QĐ-DCT:

1. **Khởi tạo kỳ đánh giá:**
   - Mỗi học kỳ mới tự động nhận **60 điểm mặc định**:
     - Tiêu chí 1: 25 điểm.
     - Tiêu chí 2: 20 điểm.
     - Tiêu chí 4: 15 điểm.
2. **Khống chế trần từng tiêu chí (Category Cap):**
   - $Score_{TC1} = \max(0, \min(25, 25 - \sum ĐiểmTrừ_{TC1}))$
   - $Score_{TC2} = \max(0, \min(20, 20 - \sum ĐiểmTrừ_{TC2}))$
   - $Score_{TC3} = \max(0, \min(20, \sum ĐiểmCộng_{TC3} - \sum ĐiểmTrừ_{TC3}))$
   - $Score_{TC4} = \max(0, \min(15, 15 - \sum ĐiểmTrừ_{TC4}))$
   - $Score_{TC5} = \max(0, \min(20, \sum ĐiểmCộng_{TC5} - \sum ĐiểmTrừ_{TC5}))$
   - **Lưu ý:** Không chuyển điểm dư giữa các tiêu chí (Điều 6.1).
3. **Tổng điểm:**
   - $TotalScore = \min(100, \sum_{i=1}^5 Score_{TCi})$
4. **Xếp loại rèn luyện (Điều 7):**
   - 90 - 100: **Xuất sắc**
   - 80 - dưới 90: **Tốt**
   - 70 - dưới 80: **Khá**
   - 50 - dưới 70: **Trung bình**
   - Dưới 50: **Yếu**
   - *Ràng buộc kỷ luật:* Bị khiển trách $\implies$ tối đa Khá (< 80đ); Bị cảnh cáo $\implies$ tối đa Trung bình (< 70đ); Đình chỉ học tập $\implies$ không đánh giá.
5. **Goal Tracker & Gợi ý lộ trình (Suggestion Engine):**
   - Tính khoảng cách: $\Delta = Target - TotalScore$.
   - Tính dung lượng còn thiếu từng tiêu chí: $RemainingCap_{TCi} = MaxCap_{TCi} - Score_{TCi}$.
   - Tự động gợi ý các hoạt động khả dĩ (ví dụ: tham gia 1 HĐ cấp trường +6đ ở TC3, tham gia CLB +3đ ở TC5).

---

## 5. Kế hoạch Phân quyền Bảo mật Cơ sở Dữ liệu (Least Privilege)

1. **Role `neondb_owner`:**
   - Toàn quyền DDL (CREATE TABLE, ALTER TABLE, DROP TABLE, CREATE INDEX).
   - Chỉ dùng trong quá trình chạy Drizzle Migration / Neon deploy.
2. **Role `drl_app_user` (Tạo mới trên Neon):**
   - Chỉ được cấp quyền `SELECT`, `INSERT`, `UPDATE`, `DELETE` trên các bảng dữ liệu `users`, `semesters`, `drl_records`, `drl_criteria_presets`.
   - **Tước bỏ hoàn toàn** quyền DDL (DROP TABLE, TRUNCATE, ALTER, GRANT).
   - Ngăn chặn kẻ tấn công lợi dụng SQL injection để phá hủy schema hoặc chiếm quyền quản trị.
3. **Application Layer Data Isolation:**
   - Sử dụng Session JWT/Cookie an toàn (HttpOnly, Secure, SameSite=Lax).
   - Tất cả các endpoint Server Actions hoặc REST API đều xác thực `session.userId` trước khi thực thi.
   - Bắt buộc kiểm tra `WHERE user_id = $userId` trên mọi thao tác `drl_records` và `semesters`.
