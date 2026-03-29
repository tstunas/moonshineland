"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface AdminActionToastProps {
  message?: string;
  type?: "success" | "error";
}

export function AdminActionToast({ message, type = "success" }: AdminActionToastProps) {
  useEffect(() => {
    if (!message) return;

    if (type === "error") {
      toast.error(message);
      return;
    }

    toast.success(message);
  }, [message, type]);

  return null;
}
