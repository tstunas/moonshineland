"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast: "mt-14",
        },
        style: {
          fontSize: "var(--pref-toast-font-size, 14px)",
        },
      }}
    />
  );
}
