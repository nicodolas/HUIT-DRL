import { driver, type Driver } from "driver.js";

export const TOUR_STORAGE_KEY = "huit_drl_tour_seen";

export function isTourSeen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}

export function setTourSeen(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }
}

export function resetTourSeen(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }
}

let activeDriverInstance: Driver | null = null;

export function startHuitTour(): Driver | null {
  if (typeof window === "undefined") return null;

  // If a tour is already active, destroy it before starting anew
  if (activeDriverInstance && activeDriverInstance.isActive()) {
    activeDriverInstance.destroy();
  }

  const driverObj = driver({
    animate: true,
    showProgress: true,
    stagePadding: 6,
    stageRadius: 16,
    allowClose: true,
    popoverClass: "huit-tour-popover",
    nextBtnText: "Tiếp tục →",
    prevBtnText: "← Quay lại",
    doneBtnText: "✓ Hoàn tất",
    progressText: "{{current}} / {{total}}",
    steps: [
      {
        element: "#tour-score-gauge",
        popover: {
          title: "🎯 Điểm rèn luyện & 5 Tiêu chí",
          description:
            "Theo dõi tổng điểm hiện tại, phân loại xếp loại rèn luyện và thanh tiến độ theo 5 tiêu chí chuẩn QĐ 3385/QĐ-DCT.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-add-record-btn",
        popover: {
          title: "➕ Ghi nhận hoạt động rèn luyện",
          description:
            "Bấm vào đây để chọn nhanh từ 65 mục tiêu chí chuẩn hoặc tự nhập hoạt động, đính kèm minh chứng và chia sẻ mã mời.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#tour-schedule-card",
        popover: {
          title: "📅 Lịch trình & Nhắc việc",
          description:
            "Theo dõi các hoạt động sắp diễn ra, nhận thông báo nhắc nhở và nhập mã mời HUIT-XXXX từ bạn bè để cùng tham gia.",
          side: "top",
          align: "start",
        },
      },
    ],
    onDoneClick: () => {
      setTourSeen();
      driverObj.destroy();
    },
    onCloseClick: () => {
      setTourSeen();
      driverObj.destroy();
    },
    onDestroyed: () => {
      setTourSeen();
      activeDriverInstance = null;
    },
  });

  activeDriverInstance = driverObj;
  driverObj.drive();
  return driverObj;
}
