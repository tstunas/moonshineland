"use client";

import type { RefObject } from "react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PostImagePickerProps {
  imageInputRef: RefObject<HTMLInputElement | null>;
  imageInputId: string;
  selectedImages: File[];
  onImageChange: (files: FileList | null) => void;
  onClearSelectedImages: () => void;
  onRemoveSelectedImage: (index: number) => void;
}

export function PostImagePicker({
  imageInputRef,
  imageInputId,
  selectedImages,
  onImageChange,
  onClearSelectedImages,
  onRemoveSelectedImage,
}: PostImagePickerProps) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          imageInputRef.current?.click();
        }}
        className="group inline-flex cursor-pointer items-center gap-4 rounded-xl border border-sky-300 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-4 py-3 text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-[22px] leading-none text-white shadow-sm transition-colors group-hover:bg-sky-600">
            +
          </span>
          <span className="text-[19px] font-semibold">이미지 첨부</span>
        </span>
        <span className="text-[15px] text-slate-500">PNG, JPG (최대 10개)</span>
      </button>
      <input
        ref={imageInputRef}
        id={imageInputId}
        name="images"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          onImageChange(event.currentTarget.files);
        }}
        className="hidden"
      />

      {selectedImages.length > 0 ? (
        <div className="mt-3 rounded-lg border border-sky-200 bg-gradient-to-b from-sky-50 to-cyan-50 px-3 py-2 text-sm text-slate-700 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              첨부 {selectedImages.length}개
            </span>
            <button
              type="button"
              onClick={onClearSelectedImages}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              전체 제거
            </button>
          </div>
          <ul className="max-h-28 space-y-1 overflow-auto rounded-md border border-sky-100 bg-white/60 p-2">
            {selectedImages.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded px-1 py-1"
              >
                <div className="min-w-0">
                  <div className="truncate">{file.name}</div>
                  <div className="text-xs text-slate-500">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveSelectedImage(index);
                  }}
                  className="shrink-0 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
