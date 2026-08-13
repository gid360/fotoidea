"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/use-toast";
import { RefreshCw, Download, CheckCircle2, AlertTriangle, Key, Building2, Calendar, User, Lock, FileSpreadsheet, Upload } from "lucide-react";

interface AltegioImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AltegioImportDialog({ open, onOpenChange, onSuccess }: AltegioImportDialogProps) {
  const [authMode, setAuthMode] = useState<"token" | "credentials" | "file">("file");

  const [companyId, setCompanyId] = useState("773942");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [userToken, setUserToken] = useState("b0a9b87010cf11775bda76899adaa7cd");
  const [partnerToken, setPartnerToken] = useState("fndrrbjmb5m5bb5rt4gf");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"clients" | "bookings">("clients");

  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-31`);
  const [importClients, setImportClients] = useState(true);
  const [importBookings, setImportBookings] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    clientsCreated: number;
    clientsUpdated: number;
    bookingsImported: number;
    errors: string[];
  } | null>(null);

  async function handleImport() {
    if (authMode === "file") {
      if (!selectedFile) {
        toast({ title: "Выберите файл CSV или Excel", variant: "destructive" });
        return;
      }

      setLoading(true);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("type", fileType);

        const res = await fetch("/api/integrations/altegio/import-file", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          toast({ title: "Ошибка импорта файла", description: data.error || "Не удалось выгрузить данные", variant: "destructive" });
        } else {
          setResult({
            clientsCreated: fileType === "clients" ? data.stats.created : 0,
            clientsUpdated: fileType === "clients" ? data.stats.updated : 0,
            bookingsImported: fileType === "bookings" ? data.stats.created : 0,
            errors: data.stats.errors || [],
          });
          toast({ title: "Импорт из файла успешно завершён!" });
          if (onSuccess) onSuccess();
        }
      } catch (e: any) {
        toast({ title: "Ошибка отправки файла", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!companyId.trim()) {
      toast({ title: "Укажите ID компании в Altegio", variant: "destructive" });
      return;
    }

    if (authMode === "credentials") {
      if (!login.trim() || !password.trim()) {
        toast({ title: "Укажите логин и пароль от Altegio", variant: "destructive" });
        return;
      }
    } else {
      if (!userToken.trim()) {
        toast({ title: "Укажите User Token авторизации Altegio", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    setResult(null);

    try {
      const payload: any = {
        companyId,
        startDate,
        endDate,
        importClients,
        importBookings,
      };

      if (authMode === "credentials") {
        payload.login = login;
        payload.password = password;
      } else {
        payload.userToken = userToken;
        payload.partnerToken = partnerToken;
      }

      const res = await fetch("/api/integrations/altegio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Ошибка импорта", description: data.error || "Не удалось выполнить импорт", variant: "destructive" });
      } else {
        setResult(data.stats);
        toast({ title: "Импорт завершен!" });
        if (onSuccess) onSuccess();
      }
    } catch (e: any) {
      toast({ title: "Ошибка сети", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Импорт данных из Altegio
          </DialogTitle>
          <DialogDescription>
            Загрузка клиентов и записей из Altegio через файл выгрузки или API.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            {/* Переключатель режима импорта */}
            <div className="flex border rounded-lg p-1 bg-muted/40 text-xs font-medium">
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  authMode === "file"
                    ? "bg-background font-semibold shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setAuthMode("file")}
              >
                📁 Из файла Excel/CSV
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  authMode === "token"
                    ? "bg-background font-semibold shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setAuthMode("token")}
              >
                🔑 По API токенам
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  authMode === "credentials"
                    ? "bg-background font-semibold shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setAuthMode("credentials")}
              >
                👤 По логину
              </button>
            </div>

            {authMode === "file" ? (
              <div className="space-y-3.5 p-3 border rounded-lg bg-muted/20">
                <div>
                  <Label className="text-xs font-semibold">Тип импортируемого файла</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={fileType === "clients" ? "default" : "outline"}
                      className="flex-1 text-xs"
                      onClick={() => setFileType("clients")}
                    >
                      <User className="h-3.5 w-3.5 mr-1" /> База клиентов
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={fileType === "bookings" ? "default" : "outline"}
                      className="flex-1 text-xs"
                      onClick={() => setFileType("bookings")}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1" /> Записи в расписание
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Файл выгрузки (CSV или TXT)</Label>
                  <div className="mt-1.5 border border-dashed rounded-lg p-4 bg-background text-center">
                    <input
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls"
                      className="hidden"
                      id="altegioFileInput"
                      onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="altegioFileInput" className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                      <Upload className="h-6 w-6 text-primary opacity-70" />
                      <span className="text-xs font-medium text-foreground">
                        {selectedFile ? selectedFile.name : "Выберите файл для загрузки"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Экспортируйте файл из Altegio (Клиенты → Экспорт или Записи → Экспорт)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ) : authMode === "credentials" ? (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    ID компании (Company ID) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1 bg-background"
                    placeholder="773942"
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Логин Altegio (Телефон или Email) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1 bg-background"
                    placeholder="+7 701 123 45 67 или email"
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    Пароль Altegio <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="password"
                    className="mt-1 bg-background"
                    placeholder="Пароль от учетной записи Altegio"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    ID компании (Company ID) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1 bg-background"
                    placeholder="773942"
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    User Token <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="password"
                    className="mt-1 bg-background"
                    placeholder="Токен пользователя Altegio"
                    value={userToken}
                    onChange={e => setUserToken(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    Partner Token (Токен партнера)
                  </Label>
                  <Input
                    type="password"
                    className="mt-1 bg-background"
                    placeholder="Партнёрский ключ Altegio"
                    value={partnerToken}
                    onChange={e => setPartnerToken(e.target.value)}
                  />
                </div>
              </div>
            )}

            {authMode !== "file" && (
              <>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Записи с даты
                    </Label>
                    <Input
                      type="date"
                      className="mt-1 text-xs"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Записи по дату
                    </Label>
                    <Input
                      type="date"
                      className="mt-1 text-xs"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium cursor-pointer" htmlFor="importClientsSwitch">
                      Импортировать базу клиентов
                    </Label>
                    <Switch
                      id="importClientsSwitch"
                      checked={importClients}
                      onCheckedChange={setImportClients}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium cursor-pointer" htmlFor="importBookingsSwitch">
                      Импортировать записи в расписание
                    </Label>
                    <Switch
                      id="importBookingsSwitch"
                      checked={importBookings}
                      onCheckedChange={setImportBookings}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-3">
            <div className="p-4 rounded-xl border bg-emerald-50 text-emerald-900 border-emerald-200">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Импорт успешно завершен!
              </div>

              <ul className="space-y-1.5 text-xs text-emerald-800">
                {fileType === "clients" || authMode !== "file" ? (
                  <>
                    <li>• Создано новых клиентов: <strong>{result.clientsCreated}</strong></li>
                    <li>• Обновлено существующих клиентов: <strong>{result.clientsUpdated}</strong></li>
                  </>
                ) : null}
                {fileType === "bookings" || authMode !== "file" ? (
                  <li>• Перенесено записей в расписание: <strong>{result.bookingsImported}</strong></li>
                ) : null}
              </ul>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="p-3 rounded-lg border bg-amber-50 text-amber-900 border-amber-200 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Предупреждения ({result.errors.length}):
                </div>
                <ul className="list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Отмена
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Импортируем...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Запустить импорт
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
