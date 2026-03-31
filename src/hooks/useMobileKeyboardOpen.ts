"use client";

import { useEffect, useState } from "react";

const MOBILE_MAX_WIDTH = 640;
const KEYBOARD_OPEN_THRESHOLD_PX = 160;

export function useMobileKeyboardOpen(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const isMobileViewport = () => window.innerWidth < MOBILE_MAX_WIDTH;

    const updateState = () => {
      if (!isMobileViewport()) {
        setIsKeyboardOpen(false);
        return;
      }

      const heightDiff = window.innerHeight - viewport.height;
      setIsKeyboardOpen(heightDiff > KEYBOARD_OPEN_THRESHOLD_PX);
    };

    const handleFocusIn = () => {
      updateState();
    };

    const handleFocusOut = () => {
      window.setTimeout(updateState, 60);
    };

    updateState();
    viewport.addEventListener("resize", updateState);
    window.addEventListener("orientationchange", updateState);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      viewport.removeEventListener("resize", updateState);
      window.removeEventListener("orientationchange", updateState);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return isKeyboardOpen;
}