"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

type Step = "preview" | "captured";

export function WebcamDialog({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("preview");
  const [error, setError] = useState<string | null>(null);
  // Crop state: offset X/Y в процентах от размера кадра, zoom
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  // Запуск камеры
  useEffect(() => {
    if (!open) return;
    setStep("preview");
    setError(null);
    setCropX(0); setCropY(0); setZoom(1);

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(() => setError("Нет доступа к камере. Разрешите использование камеры в браузере."));

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  // Отрисовка кадра в canvas при захвате
  useEffect(() => {
    if (step !== "captured") return;
    drawCrop();
  }, [step, cropX, cropY, zoom]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    streamRef.current?.getTracks().forEach(t => t.stop());
    setStep("captured");
  }

  function drawCrop() {
    const src = canvasRef.current;
    const dst = cropCanvasRef.current;
    if (!src || !dst) return;

    // Прямоугольник 3:4 (портретный формат)
    const W = 300;
    const H = 400;
    dst.width = W;
    dst.height = H;
    const ctx = dst.getContext("2d")!;

    const srcH = src.height / zoom;
    const srcW = srcH * (W / H);
    const sx = (src.width / 2 - srcW / 2) + cropX * srcW;
    const sy = (src.height / 2 - srcH / 2) + cropY * srcH;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(src, sx, sy, srcW, srcH, 0, 0, W, H);
  }

  function retake() {
    setStep("preview");
    setCropX(0); setCropY(0); setZoom(1);
    setError(null);
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      })
      .catch(() => setError("Нет доступа к камере."));
  }

  function confirm() {
    cropCanvasRef.current?.toBlob(blob => {
      if (blob) { onCapture(blob); onClose(); }
    }, "image/jpeg", 0.92);
  }

  // Drag для смещения кадрирования
  function onMouseDown(e: React.MouseEvent) {
    dragStart.current = { x: e.clientX, y: e.clientY, cx: cropX, cy: cropY };
    setDragging(true);
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart.current) return;
    const dx = (e.clientX - dragStart.current.x) / 400;
    const dy = (e.clientY - dragStart.current.y) / 400;
    const clamp = (v: number) => Math.max(-0.4, Math.min(0.4, v));
    setCropX(clamp(dragStart.current.cx - dx));
    setCropY(clamp(dragStart.current.cy - dy));
  }
  function onMouseUp() { setDragging(false); }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> Снимок с камеры
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-sm text-destructive text-center py-8 px-4 bg-destructive/10 rounded-lg">
              {error}
            </div>
          ) : (
            <>
              {/* Превью камеры */}
              {step === "preview" && (
                <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4/3" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Прямоугольная рамка 3:4 */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                      style={{ width: "56%", aspectRatio: "3/4" }} />
                  </div>
                </div>
              )}

              {/* Кадрирование */}
              {step === "captured" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Перетащите для смещения · Колесо мыши для зума</p>
                  <div
                    className="mx-auto cursor-move select-none rounded-xl overflow-hidden border"
                    style={{ width: 210, height: 280 }}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onWheel={e => {
                      e.preventDefault();
                      setZoom(z => Math.max(1, Math.min(3, z - e.deltaY * 0.002)));
                    }}
                  >
                    <canvas
                      ref={cropCanvasRef}
                      style={{ width: 210, height: 280, display: "block" }}
                    />
                  </div>
                  {/* Управление зумом */}
                  <div className="flex items-center justify-center gap-3">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                      onClick={() => setZoom(z => Math.max(1, z - 0.1))}>
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0"
                      onClick={() => setZoom(z => Math.min(3, z + 0.1))}>
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Скрытый canvas для захвата кадра */}
              <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          {step === "preview" && !error && (
            <Button onClick={capture}>
              <Camera className="h-4 w-4 mr-1.5" /> Сделать снимок
            </Button>
          )}
          {step === "captured" && (
            <>
              <Button variant="outline" onClick={retake}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Переснять
              </Button>
              <Button onClick={confirm}>
                <Check className="h-3.5 w-3.5 mr-1.5" /> Сохранить
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
