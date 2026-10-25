/**
 * Browser Notification & Submission Deadline Alert Utility
 * Provides desktop & mobile browser notification support for HUIT DRL deadlines.
 */

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (typeof window !== "undefined") {
      localStorage.setItem("huit_notification_permission", permission);
    }
    return permission as NotificationPermissionState;
  } catch (err) {
    console.warn("Lỗi yêu cầu quyền thông báo:", err);
    return "denied";
  }
}

export interface SendNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  badge?: string;
  data?: any;
}

export function sendLocalNotification(
  title: string,
  options: SendNotificationOptions = {}
): boolean {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const notif = new Notification(title, {
      body: options.body || "Thông báo từ Hệ thống ĐRL HUIT",
      icon: options.icon || "/icons/icon-192.png",
      tag: options.tag || "huit_drl_alert",
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.warn("Không thể gửi thông báo cục bộ:", err);
    return false;
  }
}

/**
 * Check semester deadline and trigger reminder if nearing submission cutoff
 */
export function checkAndNotifyDeadline(
  semesterName: string,
  deadlineStr?: string | null
): { shouldAlert: boolean; daysRemaining: number | null; message: string } {
  if (!deadlineStr) {
    return { shouldAlert: false, daysRemaining: null, message: "Chưa thiết lập hạn chót." };
  }

  const deadline = new Date(deadlineStr);
  if (isNaN(deadline.getTime())) {
    return { shouldAlert: false, daysRemaining: null, message: "Ngày hạn chót không hợp lệ." };
  }

  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      shouldAlert: true,
      daysRemaining,
      message: `Đã quá hạn nộp hồ sơ ${semesterName} (${Math.abs(daysRemaining)} ngày trước).`,
    };
  }

  if (daysRemaining <= 7) {
    const message =
      daysRemaining === 0
        ? `Hôm nay là hạn chót nộp hồ sơ đánh giá ĐRL ${semesterName}!`
        : `Còn ${daysRemaining} ngày nữa là đến hạn nộp hồ sơ ĐRL ${semesterName}.`;

    // Avoid spamming: alert at most once per 12 hours
    const lastAlertKey = `huit_last_deadline_alert_${semesterName}`;
    const lastAlertTime = typeof window !== "undefined" ? localStorage.getItem(lastAlertKey) : null;
    const nowTime = Date.now();

    if (!lastAlertTime || nowTime - Number(lastAlertTime) > 12 * 60 * 60 * 1000) {
      sendLocalNotification("Nhắc nhở hạn chót ĐRL HUIT", {
        body: message,
        tag: `deadline_${semesterName}`,
      });
      if (typeof window !== "undefined") {
        localStorage.setItem(lastAlertKey, String(nowTime));
      }
    }

    return { shouldAlert: true, daysRemaining, message };
  }

  return {
    shouldAlert: false,
    daysRemaining,
    message: `Còn ${daysRemaining} ngày đến hạn nộp.`,
  };
}
