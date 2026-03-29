"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

export interface GalleryImage {
  id: number;
  imageUrl: string;
  sortOrder: number;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  /** 미리보기에 표시할 alt 접두어 (예: "post-3", "auto-2") */
  altPrefix: string;
}

/** 전체화면 캐러셀 오버레이 */
function ImageCarouselOverlay({
  images,
  startIndex,
  onClose,
  altPrefix,
}: {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
  altPrefix: string;
}) {
  const [current, setCurrent] = useState(startIndex);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  // 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const image = images[current];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      {/* 상단 바 */}
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-white/80">
          {current + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* 이미지 영역 */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 이전 버튼 */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-xl text-white hover:bg-black/60 md:left-4"
            aria-label="이전 이미지"
          >
            ‹
          </button>
        )}

        <div className="relative max-h-full max-w-full" style={{ width: "min(100vw, 900px)", height: "min(80vh, 700px)" }}>
          <Image
            key={image.id}
            src={image.imageUrl}
            alt={`${altPrefix}-${image.sortOrder}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 900px"
          />
        </div>

        {/* 다음 버튼 */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={next}
            className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-xl text-white hover:bg-black/60 md:right-4"
            aria-label="다음 이미지"
          >
            ›
          </button>
        )}
      </div>

      {/* 썸네일 스트립 */}
      {images.length > 1 && (
        <div
          className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`relative h-12 w-12 shrink-0 overflow-hidden rounded border-2 transition-all ${
                idx === current
                  ? "border-sky-400 opacity-100"
                  : "border-white/20 opacity-60 hover:opacity-90"
              }`}
            >
              <Image
                src={img.imageUrl}
                alt={`thumb-${img.sortOrder}`}
                fill
                className="object-cover"
                sizes="48px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 첫 번째 이미지 미리보기 + 추가 이미지 개수 표시.
 * 클릭하면 전체화면 캐러셀이 열립니다.
 */
export function ImageGallery({ images, altPrefix }: ImageGalleryProps) {
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const first = images[0];
  const extra = images.length - 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setCarouselIndex(0)}
        className="group relative mb-3 block overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
        aria-label="이미지 갤러리 열기"
      >
        {/* 첫 번째 이미지 — 최대 300px 너비, 비율 유지 */}
        <div className="relative" style={{ maxWidth: "300px" }}>
          <Image
            src={first.imageUrl}
            alt={`${altPrefix}-${first.sortOrder}`}
            width={300}
            height={300}
            className="h-auto w-full object-contain transition-opacity group-hover:opacity-90"
            sizes="300px"
            style={{ maxWidth: "300px", height: "auto" }}
          />
        </div>

        {/* 추가 이미지 배지 */}
        {extra > 0 && (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
            +{extra}장
          </div>
        )}
      </button>

      {carouselIndex !== null && (
        <ImageCarouselOverlay
          images={images}
          startIndex={carouselIndex}
          onClose={() => setCarouselIndex(null)}
          altPrefix={altPrefix}
        />
      )}
    </>
  );
}
