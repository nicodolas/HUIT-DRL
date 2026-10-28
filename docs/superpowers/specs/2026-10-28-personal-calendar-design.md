# Đặc tả Kỹ thuật: Hệ thống Lịch Cá Nhân & Nhắc Việc Rèn Luyện (Personal Training Calendar & Schedule Reminders)

## 1. Mục tiêu (Goals)
- Giúp sinh viên trường Đại học Công Thương TP.HCM (HUIT) chủ động theo dõi lịch trình hoạt động rèn luyện sắp tới.
- Cho phép lên lịch các hoạt động tương lai (có thời gian, ngày diễn ra, giờ cụ thể và địa điểm).
- Tự động hiển thị các cảnh báo nhắc việc thông minh ngay trên trang Tổng quan (Dashboard) khi có sự kiện diễn ra "Hôm nay" hoặc "Ngày mai".
- Cung cấp trang Lịch cá nhân (`/calendar`) trực quan hỗ trợ cả Chế độ Lịch tháng (Monthly Grid) với chấm màu 5 tiêu chí QĐ 3385 và Chế độ Dòng thời gian (Agenda/Timeline).
- Khi thời gian diễn ra hoạt động đã trôi qua, tự động cộng điểm vào sổ điểm rèn luyện và hiển thị nhãn nhắc nhở bổ sung minh chứng nếu sinh viên chưa nộp bằng chứng.

---

## 2. Thiết kế Kiến trúc & Điều hướng (UI & Navigation)

### 2.1. Thanh điều hướng
- **Desktop Header (`src/components/layout/Header.tsx`)**:
  - Thêm link `Lịch trình` trỏ đến `/calendar`, nằm giữa `Sổ điểm` và `Mục tiêu`.
- **Mobile BottomNav (`src/components/layout/BottomNav.tsx`)**:
  - Bổ sung biểu tượng `Calendar` trỏ đến `/calendar`.

### 2.2. Trang chủ Tổng quan (`src/app/page.tsx`)
- **Banner Nhắc nhở Cấp bách (`ScheduleReminderBanner`)**:
  - Hiển thị nổi bật ở đầu trang nếu có sự kiện diễn ra trong vòng 24 - 48 giờ tới ("Hôm nay" hoặc "Ngày mai").
- **Widget Thẻ Sự kiện Sắp tới (`UpcomingScheduleCard`)**:
  - Hiển thị danh sách các hoạt động dự kiến trong 7 - 14 ngày tới.
  - Có đếm ngược thời gian ("Hôm nay", "Ngày mai", "Còn 3 ngày..."), giờ diễn ra và số điểm dự kiến.
  - Nút chuyển nhanh đến trang `/calendar`.

### 2.3. Trang Lịch Cá Nhân (`src/app/calendar/page.tsx`)
- **Bộ lọc & Điều khiển**:
  - Chọn tháng / năm (Next / Prev month, Today).
  - Nút chuyển đổi View: `Lịch tháng (Grid)` vs `Danh sách (Agenda Timeline)`.
  - Nút `+ Lên lịch hoạt động` mở modal thêm hoạt động.
- **Lưới Lịch Tháng (Monthly Calendar Grid)**:
  - Hiển thị 7 cột (Thứ 2 đến Chủ nhật) và các ô ngày trong tháng.
  - Ngày có sự kiện hiển thị chấm màu đại diện cho 5 Tiêu chí:
    - Tiêu chí 1: Xanh lá
    - Tiêu chí 2: Xanh dương
    - Tiêu chí 3: Cam
    - Tiêu chí 4: Tím
    - Tiêu chí 5: Hồng/Đỏ
  - Ô ngày được chọn sẽ mở danh sách chi tiết các sự kiện trong ngày đó.
- **Chế độ Danh sách Dòng thời gian (Agenda Timeline)**:
  - Liệt kê các sự kiện theo ngày tháng tăng dần.
  - Hiển thị rõ: Tên sự kiện, Tiêu chí, Điểm dự kiến, Giờ diễn ra, Địa điểm/Ghi chú, và Trạng thái (Đã diễn ra / Sắp tới / Chưa có minh chứng).

---

## 3. Mô hình Dữ liệu & Nghiệp vụ (Data & Business Logic)

### 3.1. Dữ liệu thời gian trong `drl_records`
- Trường `occurred_at` lưu trữ:
  - Dạng ngày: `YYYY-MM-DD` (ví dụ `2026-11-15`)
  - Hoặc dạng ngày giờ: `YYYY-MM-DDTHH:mm` (ví dụ `2026-11-15T08:30`)
- Ghi chú `note` hỗ trợ lưu kèm địa điểm tổ chức (ví dụ: `Hội trường A - Cơ sở chính`).

### 3.2. Nghiệp vụ chuyển đổi trạng thái & Tính điểm
- **Sự kiện Tương lai (`occurredAt > now`)**:
  - Đánh dấu là sự kiện sắp tới / kế hoạch rèn luyện.
- **Sự kiện Đã qua (`occurredAt <= now`)**:
  - Tự động cộng điểm vào tổng điểm rèn luyện của học kỳ.
  - Nếu `evidenceUrl` trống: Hiển thị nhãn cảnh báo `Chưa có minh chứng` để sinh viên tự quản lý và bổ sung.

---

## 4. Kế hoạch Kiểm thử E2E (Playwright Tests)
- `tests/e2e/personal-calendar.spec.ts`:
  1. Kiểm tra điều hướng `/calendar` trên Header và BottomNav.
  2. Tạo sự kiện tương lai với ngày + giờ cụ thể.
  3. Kiểm tra Widget "Lịch trình sắp tới" xuất hiện trên Dashboard.
  4. Kiểm tra Banner nhắc nhở hoạt động hôm nay/ngày mai.
  5. Chuyển đổi giữa chế độ Lịch tháng (Grid) và Danh sách (Agenda) trên `/calendar`.
  6. Kiểm tra hiển thị cảnh báo "Chưa có minh chứng" cho hoạt động đã diễn ra.

