/**
 * Cross-platform API Client for Web, PWA, and Android Capacitor.
 * Ensures consistent authentication (Cookies + Authorization Bearer)
 * and resolves base backend URLs when running inside Android WebView.
 */

import { isCapacitorNative } from "@/lib/native/platform";
import { APP_CONFIG } from "@/lib/config/env";

export const AUTH_TOKEN_KEY = "huit_auth_token";

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";

  // If running inside Capacitor Native Android/iOS
  if (isCapacitorNative()) {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || APP_CONFIG.appUrl;
    if (configuredUrl) {
      return configuredUrl.replace(/\/$/, "");
    }
  }

  return "";
}

export function resolveApiUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;

  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = resolveApiUrl(path);
  const headers = new Headers(options.headers || {});

  // On Android native / cross-origin WebView, attach Bearer token if present
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });
}

export function saveAuthToken(token?: string | null): void {
  if (typeof window === "undefined" || !token) return;
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) {
    console.warn("Could not save auth token to localStorage:", e);
  }
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) {
    console.warn("Could not clear auth token from localStorage:", e);
  }
}

