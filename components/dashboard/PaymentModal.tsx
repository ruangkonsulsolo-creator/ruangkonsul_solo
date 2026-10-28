"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface PaymentModalProps {
  snapToken: string;
  onClose: () => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess: (result: unknown) => void;
          onPending: (result: unknown) => void;
          onError: (result: unknown) => void;
          onClose: () => void;
        }
      ) => void;
      hide: () => void;
    };
  }
}

export function PaymentModal({ snapToken, onClose }: PaymentModalProps) {
  const router = useRouter();
  const snapLoaded = useRef(false);

  useEffect(() => {
    // Load Midtrans SNAP script jika belum ada
    if (!document.getElementById("midtrans-snap")) {
      const script = document.createElement("script");
      script.id = "midtrans-snap";
      script.src =
        process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
          ? "https://app.midtrans.com/snap/snap.js"
          : "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute(
        "data-client-key",
        process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? ""
      );
      script.onload = () => {
        snapLoaded.current = true;
        openSnap();
      };
      document.body.appendChild(script);
    } else {
      openSnap();
    }

    function openSnap() {
      window.snap?.pay(snapToken, {
        onSuccess: () => {
          router.push("/dashboard/riwayat-pesanan?paid=1");
          router.refresh();
        },
        onPending: () => {
          router.push("/dashboard/riwayat-pesanan?pending=1");
          router.refresh();
        },
        onError: () => {
          onClose();
        },
        onClose: () => {
          onClose();
        },
      });
    }

    return () => {
      window.snap?.hide?.();
    };
  }, [snapToken]);

  // Midtrans SNAP merender UI-nya sendiri di atas halaman.
  // Kita render overlay tipis sebagai fallback/close button.
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-end p-4"
      aria-label="Modal pembayaran Midtrans"
    >
      <button
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-slate-100"
        aria-label="Tutup pembayaran"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
