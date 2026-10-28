"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="alert"
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
        type === "success" && "bg-brand text-white",
        type === "error" && "bg-red-600 text-white",
        type === "info" && "bg-slate-800 text-white"
      )}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100"
        aria-label="Tutup notifikasi"
      >
        ✕
      </button>
    </div>
  );
}

// Simple toast state hook
export function useToast() {
  const [toast, setToast] = React.useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = React.useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type });
    },
    []
  );

  const hideToast = React.useCallback(() => setToast(null), []);

  return { toast, showToast, hideToast };
}
