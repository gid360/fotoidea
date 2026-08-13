"use client";

import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";

export function AvatarLightbox({
  src,
  alt = "Изображение",
  isVideo = false,
  isPdf = false,
  onClose,
}: {
  src: string;
  alt?: string;
  isVideo?: boolean;
  isPdf?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>

      {isPdf ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl h-[70vh] max-h-[650px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col relative"
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[70%]">
              {alt && alt !== "Изображение" ? alt : "Документ PDF"}
            </span>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Открыть в новой вкладке
            </a>
          </div>
          <iframe
            src={src}
            className="w-full flex-1 border-0"
          />
        </div>
      ) : isVideo ? (
        <video
          src={src}
          controls
          autoPlay
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl object-contain"
        />
      ) : (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl object-contain select-none"
        />
      )}
    </div>
  );
}
