"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/use-toast";

const schema = z.object({
  lastName:  z.string().min(1, "Введите фамилию"),
  firstName: z.string().min(1, "Введите имя"),
  phone:     z.string().min(5, "Введите телефон"),
  email:     z.string().email().optional().or(z.literal("")),
  birthDate: z.string().optional(),
  note:      z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateClientDialog({ open, onClose, onCreated }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { toast({ title: "Ошибка", description: json.error, variant: "destructive" }); return; }
    toast({ title: `${json.firstName} ${json.lastName} добавлен(а)` });
    reset();
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Новый клиент</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Фамилия *</Label>
              <Input {...register("lastName")} className="mt-1" placeholder="Иванова" />
              {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>}
            </div>
            <div>
              <Label>Имя *</Label>
              <Input {...register("firstName")} className="mt-1" placeholder="Анна" />
              {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
            </div>
          </div>
          <div>
            <Label>Телефон *</Label>
            <Input {...register("phone")} className="mt-1" placeholder="+7 700 000 00 00" />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <Label>Email</Label>
            <Input {...register("email")} className="mt-1" type="email" placeholder="email@example.com" />
          </div>
          <div>
            <Label>Дата рождения</Label>
            <Input {...register("birthDate")} className="mt-1" type="date" />
          </div>
          <div>
            <Label>Примечание</Label>
            <Input {...register("note")} className="mt-1" placeholder="Необязательно" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Сохраняем..." : "Создать"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
