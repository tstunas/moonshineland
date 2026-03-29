"use client";

import { useEffect } from "react";

import {
  CSS_VAR_TOAST_SIZE,
  PREFS_TOAST_SIZE,
  TOAST_SIZE_DEFAULT,
} from "@/lib/preferences";

/**
 * 마운트 시 localStorage에 저장된 개인선호설정을 CSS 변수로 적용하는 컴포넌트.
 * RootLayout에 한 번만 마운트된다.
 */
export function PreferencesCssApplier() {
  useEffect(() => {
    const stored = window.localStorage.getItem(PREFS_TOAST_SIZE);
    const size = stored ? Number(stored) : TOAST_SIZE_DEFAULT;
    document.documentElement.style.setProperty(
      CSS_VAR_TOAST_SIZE,
      `${size}px`,
    );
  }, []);

  return null;
}
