"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, RefreshCw, Check, RotateCcw } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (blob: Blob, name: string) => void;
}

type Step = "preview" | "captured";

export function DocScanDialog({ open, onClose, onSave }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("preview");
  const [error, setError] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

  useEffect(() => {
    if (!open) return;
    setStep("preview");
    setError(null);
    setDocName("");
    setRotation(0);

    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" } })
      .catch(() =>
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      )
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

  function getRotatedCanvas(): HTMLCanvasElement {
    const src = canvasRef.current!;
    const deg = rotation % 360;
    if (deg === 0) return src;

    const dst = document.createElement("canvas");
    const swap = deg === 90 || deg === 270;
    dst.width  = swap ? src.height : src.width;
    dst.height = swap ? src.width  : src.height;
    const ctx = dst.getContext("2d")!;
    ctx.translate(dst.width / 2, dst.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);
    return dst;
  }

  function confirm() {
    const rotated = getRotatedCanvas();
    rotated.toBlob(blob => {
      if (blob) {
        const name = docName.trim() || `Скан ${new Date().toLocaleDateString("ru-KZ")}`;
        onSave(blob, `${name}.jpg`);
        onClose();
      }
    }, "image/jpeg", 0.92);
  }

  function retake() {
    setStep("preview");
    setRotation(0);
    setError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      })
      .catch(() => setError("Нет доступа к камере."));
  }

  // Вычисляем стиль превью с учётом поворота
  const swap = rotation === 90 || rotation === 270;
  const previewStyle: React.CSSProperties = swap
    ? { transform: `rotate(${rotation}deg) scale(${canvasRef.current ? canvasRef.current.height / canvasRef.current.width : 0.75})`, transformOrigin: "center" }
    : { transform: `rotate(${rotation}deg)` };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> Сканирование документа
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
                <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/9" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Рамка документа */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="border-2 border-white/70 rounded shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
                      style={{ width: "80%", height: "80%" }}
                    />
                  </div>
                  <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs">
                    Расположите документ в рамке
                  </p>
                </div>
              )}

              {/* Захваченный снимок */}
              {step === "captured" && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center" style={{ minHeight: 280 }}>
                    <canvas
                      ref={canvasRef}
                      style={{
                        ...previewStyle,
                        maxWidth: "100%",
                        maxHeight: 400,
                        display: "block",
                      }}
                    />
                    {/* Скрытый ref — нужен для capture */}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => setRotation(r => (r + 90) % 360)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Повернуть
                    </Button>
                    <span className="text-xs text-muted-foreground">{rotation}°</span>
                  </div>
                  <div>
                    <Label className="text-xs">Название документа</Label>
                    <Input
                      className="mt-1"
                      placeholder={`Скан ${new Date().toLocaleDateString("ru-KZ")}`}
                      value={docName}
                      onChange={e => setDocName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && confirm()}
                    />
                  </div>
                </div>
              )}

              {/* Скрытый canvas для capture */}
              {step === "preview" && <canvas ref={canvasRef} className="hidden" />}
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
                <Check className="h-3.5 w-3.5 mr-1.5" /> Сохранить документ
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
