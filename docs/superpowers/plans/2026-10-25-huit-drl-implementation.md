# HUIT DRL - Quản lý Điểm Rèn Luyện Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng ứng dụng Web và Mobile Android quản lý điểm rèn luyện cá nhân cho sinh viên HUIT theo quy chế 3385/QĐ-DCT với Neon Serverless PostgreSQL và phân quyền bảo mật cao.

**Architecture:** Single codebase Next.js 15 App Router + Tailwind CSS + shadcn/ui đóng gói native Android qua Capacitor. Backend kết nối Neon PostgreSQL qua Drizzle ORM với phân tách vai trò owner/app_user để chống khai thác.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Drizzle ORM, Neon PostgreSQL (`@neondatabase/serverless`), Capacitor 6, Lucide React.

**Spec:** `docs/superpowers/specs/2026-10-25-huit-drl-system-design.md`

## Global Constraints
- Căn cứ chuẩn: Quyết định 3385/QĐ-DCT HUIT (Khởi tạo mặc định 60đ: TC1=25, TC2=20, TC4=15; Thang 100đ; Capped từng tiêu chí).
- Least privilege: Không chạy truy vấn người dùng bằng role có quyền DDL DROP/ALTER.
- Multiplatform: Giao diện chuẩn Mobile-first, responsive trên Desktop, chạy trong Capacitor Android WebView không lỗi.

---

### Task 1: Neon Database Setup & Least-Privilege Security Roles

**Files:**
- Create: `scripts/setup-db-security.py` (hoặc `.sql`)
- Create: `.env.local`
- Create: `.env.example`

**Interfaces:**
- Produces: Role `drl_app_user` trên Neon với quyền DML hạn chế (SELECT, INSERT, UPDATE, DELETE) và connection string an toàn cho runtime app.

- [ ] **Step 1: Viết script thiết lập role `drl_app_user` và phân quyền**
- [ ] **Step 2: Thực thi trên Neon DB bằng owner connection string**
- [ ] **Step 3: Kiểm tra thử nghiệm quyền: SELECT/INSERT thành công, DROP TABLE bị từ chối**
- [ ] **Step 4: Cấu hình `.env.local`**

---

### Task 2: Project Scaffolding & Next.js 15 Setup

**Files:**
- Create/Modify: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: Khởi tạo cấu hình dependencies (Next.js 15, React 19, Tailwind, Drizzle, Lucide)**
- [ ] **Step 2: Cài đặt packages bằng `npm install`**
- [ ] **Step 3: Thiết lập Tailwind CSS và font theme theo màu sắc HUIT (Navy Blue #003366, Orange #F37021)**
- [ ] **Step 4: Kiểm tra build cơ sở `npm run build`**

---

### Task 3: Drizzle ORM Schema, Database Client & Seed Data QĐ 3385

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `src/lib/db/seed.ts`

**Interfaces:**
- Produces: Tables `users`, `semesters`, `drl_criteria_presets`, `drl_records`
- Seed data: 25+ tiêu chí chuẩn của HUIT theo Quyết định 3385.

- [ ] **Step 1: Định nghĩa schema Drizzle cho 4 bảng dữ liệu**
- [ ] **Step 2: Cấu hình Drizzle client với `@neondatabase/serverless` / `pg`**
- [ ] **Step 3: Chạy migration hoặc `drizzle-kit push` để tạo bảng trên Neon DB**
- [ ] **Step 4: Chạy seed script nạp toàn bộ danh mục tiêu chí chuẩn của QĐ 3385**

---

### Task 4: Simple Authentication & Session System

**Files:**
- Create: `src/lib/auth/password.ts` (Argon2 / scrypt hashing)
- Create: `src/lib/auth/session.ts` (Iron-session / JWT token cookies)
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Viết module hash mật khẩu an toàn và mã hóa session token**
- [ ] **Step 2: Viết API endpoints đăng ký, đăng nhập (hỗ trợ MSSV/Email)**
- [ ] **Step 3: Viết giao diện trang đăng nhập và đăng ký hiện đại**
- [ ] **Step 4: Tự động khởi tạo Học kỳ hiện tại (mặc định 60đ) ngay khi sinh viên đăng ký mới**

---

### Task 5: Business Engine (Tính Điểm, Capping, Xếp Loại & Goal Tracker)

**Files:**
- Create: `src/lib/drl/calculator.ts`
- Create: `src/lib/drl/rules.ts`
- Create: `src/app/api/semesters/route.ts`
- Create: `src/app/api/records/route.ts`
- Create: `src/app/api/records/[id]/route.ts`
- Create: `src/app/api/goals/route.ts`

**Interfaces:**
- Functions: `calculateSemesterScore(records, disciplineLevel)`
- Functions: `analyzeGoalGap(currentScore, targetScore, categoryScores)`

- [ ] **Step 1: Viết unit tests kiểm tra thuật toán tính điểm và trần 5 tiêu chí**
- [ ] **Step 2: Viết engine tính điểm và xếp loại chuẩn theo QĐ 3385**
- [ ] **Step 3: Viết Goal Tracker analyzer gợi ý tiêu chí còn dư khung**
- [ ] **Step 4: Viết API CRUD hoạt động rèn luyện (thêm, sửa, xóa mục điểm)**

---

### Task 6: Modern UI/UX Dashboard & Mobile Bottom Navigation

**Files:**
- Create: `src/components/layout/BottomNav.tsx`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/dashboard/ScoreGauge.tsx`
- Create: `src/components/dashboard/CriteriaBreakdown.tsx`
- Create: `src/components/dashboard/GoalTrackerCard.tsx`
- Create: `src/components/records/AddRecordModal.tsx`
- Create: `src/components/records/RecordList.tsx`
- Create: `src/app/(dashboard)/page.tsx`
- Create: `src/app/(dashboard)/records/page.tsx`
- Create: `src/app/(dashboard)/goals/page.tsx`
- Create: `src/app/(dashboard)/profile/page.tsx`

- [ ] **Step 1: Xây dựng Gauge tròn hiển thị tổng điểm rèn luyện (xanh/vàng/đỏ) và danh hiệu xếp loại**
- [ ] **Step 2: Xây dựng thanh tiến độ 5 tiêu chí (TC1 -> TC5) trực quan với thanh bar tỉ lệ**
- [ ] **Step 3: Xây dựng Modal "Thêm hoạt động/tiêu chí" với preset chuẩn HUIT (chọn 1 click)**
- [ ] **Step 4: Xây dựng màn hình Goal Tracker phân tích "Cần làm gì để đạt Xuất sắc/Tốt"**
- [ ] **Step 5: Xây dựng Mobile Bottom Navigation Bar mượt mà**

---

### Task 7: Capacitor Android Mobile Setup

**Files:**
- Create: `capacitor.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Cài đặt `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`**
- [ ] **Step 2: Cấu hình `capacitor.config.ts` trỏ tới app URL / static export**
- [ ] **Step 3: Thêm lệnh npm scripts: `npm run cap:sync`, `npm run cap:open:android`**

---

### Task 8: Verification, Test Suite & Build Verification

- [ ] **Step 1: Chạy `npm run build` để kiểm tra 0 lỗi TypeScript và compilation**
- [ ] **Step 2: Chạy kiểm tra kết nối Neon database với role hạn chế**
- [ ] **Step 3: Chạy test luồng đăng ký -> tự cộng điểm -> kiểm tra trần -> kiểm tra xếp loại**

