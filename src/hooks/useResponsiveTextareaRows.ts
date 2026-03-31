import { useEffect, useState } from "react";

const MOBILE_MAX_WIDTH_MEDIA_QUERY = "(max-width: 639px)";

export function useResponsiveTextareaRows(): number {
  const [rows, setRows] = useState(3);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MAX_WIDTH_MEDIA_QUERY);

    const applyRows = (isMobile: boolean) => {
      setRows(isMobile ? 3 : 5);
    };

    applyRows(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => {
      applyRows(event.matches);
    };

    mediaQuery.addEventListener("change", onChange);
    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, []);

  return rows;
}