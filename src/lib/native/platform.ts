/**
 * Native platform detection and UX haptics for Capacitor Android & PWA
 */

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((window as any).Capacitor?.isNativePlatform?.());
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window.navigator as any).standalone)
  );
}

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export function triggerHaptic(type: HapticType = "light"): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;

  try {
    switch (type) {
      case "light":
        navigator.vibrate(12);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "heavy":
        navigator.vibrate(45);
        break;
      case "success":
        navigator.vibrate([15, 60, 25]);
        break;
      case "warning":
        navigator.vibrate([30, 80, 30]);
        break;
      case "error":
        navigator.vibrate([50, 100, 50, 100, 50]);
        break;
    }
  } catch {
    // Ignore environments where navigator.vibrate throws or is disabled by user gesture policy
  }
}
