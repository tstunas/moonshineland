"use client";

import { useEffect } from "react";
import Image from "next/image";

interface InlineImageLightboxProps {
  imageUrl: string;
  onClose: () => void;
}

export function InlineImageLightbox({
  imageUrl,
  onClose,
}: InlineImageLightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
        aria-label="닫기"
      >
        ✕
      </button>
      <div
        className="relative h-[92vh] w-[96vw]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Image
          src={imageUrl}
          alt="inline-image-fullscreen"
          fill
          className="object-contain"
          sizes="96vw"
        />
      </div>
    </div>
  );
}
