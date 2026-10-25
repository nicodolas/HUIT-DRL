"use client";

import { useEffect } from "react";

export const ServiceWorkerRegister: React.FC = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("HUIT ĐRL Service Worker active with scope:", reg.scope);
          })
          .catch((err) => {
            console.warn("Service Worker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
};
