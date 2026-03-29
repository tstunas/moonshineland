"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __MOONSHINE_PERF_MEASURE_GUARD__?: boolean;
  }
}

function sanitizeMeasureOptions(options: unknown) {
  if (!options || typeof options !== "object") {
    return options;
  }

  const nextOptions = { ...(options as Record<string, unknown>) };
  const rawStart = nextOptions.start;
  const rawEnd = nextOptions.end;

  if (typeof rawStart === "number" && rawStart < 0) {
    nextOptions.start = 0;
  }

  if (typeof rawEnd === "number" && rawEnd < 0) {
    nextOptions.end = 0;
  }

  const start = typeof nextOptions.start === "number" ? nextOptions.start : undefined;
  const end = typeof nextOptions.end === "number" ? nextOptions.end : undefined;

  if (start !== undefined && end !== undefined && end < start) {
    nextOptions.end = start;
  }

  return nextOptions;
}

export function PerformanceMeasureGuard() {
  useEffect(() => {
    if (window.__MOONSHINE_PERF_MEASURE_GUARD__) {
      return;
    }

    if (typeof performance === "undefined" || typeof performance.measure !== "function") {
      return;
    }

    const originalMeasure = performance.measure.bind(performance);

    performance.measure = ((name: string, ...rest: unknown[]) => {
      if (rest.length === 0) {
        return originalMeasure(name);
      }

      // measure(name, options) 형태에서만 timestamp 보정
      if (rest.length === 1) {
        return originalMeasure(name, sanitizeMeasureOptions(rest[0]) as never);
      }

      return originalMeasure(name, rest[0] as never, rest[1] as never);
    }) as Performance["measure"];

    window.__MOONSHINE_PERF_MEASURE_GUARD__ = true;
  }, []);

  return null;
}
