"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Camera } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>("/logo.svg");
  const [studioName, setStudioName] = useState("Fotoidea");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: Record<string, string>) => {
        if (s.logoUrl) setLogoUrl(s.logoUrl);
        if (s.studioName) setStudioName(s.studioName);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      login: login.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Неверный логин или пароль");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Логотип" className="h-16 w-16 object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Camera className="h-6 w-6 text-primary-foreground" />
              </div>
            )}
          </div>
          <CardTitle className="text-xl">{studioName}</CardTitle>
          <CardDescription>Войдите в систему для продолжения</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="login">Номер телефона</Label>
              <Input
                id="login"
                className="mt-1"
                placeholder="+7 (7XX) XXX-XX-XX"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
