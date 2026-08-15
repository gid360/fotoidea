"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Users, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatMoney, formatDate } from "@/lib/utils";
import { LoyaltyTag } from "@prisma/client";
import { CreateClientDialog } from "./CreateClientDialog";
import { AltegioImportDialog } from "@/components/AltegioImportDialog";

const LOYALTY_CONFIG: Record<LoyaltyTag, { label: string; className: string }> = {
  NEW:     { label: "Новый",      className: "bg-blue-100 text-blue-700" },
  REGULAR: { label: "Постоянный", className: "bg-green-100 text-green-700" },
  LOST:    { label: "Потерянный", className: "bg-red-100 text-red-700" },
};

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  loyaltyTag: LoyaltyTag;
  createdAt: string;
  firstVisit?: string | null;
  lastVisit?: string | null;
  totalSales?: number;
  _count: { bookings: number };
}

interface ClientsResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type SortField = "name" | "phone" | "status" | "totalSales" | "visits" | "lastVisit" | "firstVisit";
type SortOrder = "asc" | "desc";

export function ClientsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<LoyaltyTag | "">("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const [altegioOpen, setAltegioOpen] = useState(false);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  // Auto-open create dialog when ?new=1 in URL
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateOpen(true);
      router.replace("/clients");
    }
  }, [searchParams, router]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleTagFilterChange = (tag: LoyaltyTag | "") => {
    setTagFilter(tag);
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "visits" || field === "lastVisit" || field === "firstVisit" ? "desc" : "asc");
    }
    setPage(1);
  };

  const { data, refetch, isLoading, isFetching } = useQuery<ClientsResponse>({
    queryKey: ["clients", search, tagFilter, page, limit, sortBy, sortOrder],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (tagFilter) params.set("tag", tagFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      return fetch(`/api/clients?${params}`).then(r => r.json());
    },
    placeholderData: (previousData) => previousData,
  });

  const clients = data?.clients || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const tags: { value: LoyaltyTag | ""; label: string }[] = [
    { value: "", label: "Все" },
    { value: "NEW", label: "Новые" },
    { value: "REGULAR", label: "Постоянные" },
    { value: "LOST", label: "Потерянные" },
  ];

  const renderSortHeader = (label: string, field: SortField, align: "left" | "right" = "left") => {
    const isActive = sortBy === field;
    return (
      <th
        className={cn(
          "px-4 py-2.5 font-medium cursor-pointer select-none transition-colors hover:text-foreground group",
          align === "right" ? "text-right" : "text-left",
          isActive ? "text-foreground font-semibold" : "text-muted-foreground"
        )}
        onClick={() => handleSort(field)}
      >
        <div className={cn("inline-flex items-center gap-1.5", align === "right" && "flex-row-reverse")}>
          <span>{label}</span>
          {isActive ? (
            sortOrder === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Шапка */}
      <div className="p-4 border-b bg-background shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">База клиентов</h1>
            <p className="text-sm text-muted-foreground">{total} клиентов</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAltegioOpen(true)}>
              <Download className="h-4 w-4 mr-1.5" /> Импорт из Altegio
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Новый клиент
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, телефону..."
              className="pl-9 pr-9"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [f, o] = e.target.value.split("-") as [SortField, SortOrder];
                setSortBy(f);
                setSortOrder(o);
                setPage(1);
              }}
              className="h-9 rounded-md border bg-background px-2.5 text-xs font-medium focus:outline-none md:hidden shrink-0"
            >
              <option value="name-asc">Сортировка: Имя (А-Я)</option>
              <option value="name-desc">Сортировка: Имя (Я-А)</option>
              <option value="totalSales-desc">Сортировка: Продано (сначала больше)</option>
              <option value="totalSales-asc">Сортировка: Продано (сначала меньше)</option>
              <option value="visits-desc">Сортировка: Визиты (сначала много)</option>
              <option value="visits-asc">Сортировка: Визиты (сначала мало)</option>
              <option value="lastVisit-desc">Сортировка: Посл. визит (свежие)</option>
              <option value="firstVisit-desc">Сортировка: Первый визит (свежие)</option>
            </select>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {tags.map(t => (
                <button
                  key={t.value}
                  onClick={() => handleTagFilterChange(t.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors whitespace-nowrap",
                    tagFilter === t.value
                      ? "bg-foreground text-background border-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Список */}
      <div className="flex-1 overflow-auto relative">
        {isLoading || (isFetching && !data) ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="font-medium text-sm">Загрузка клиентов...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Клиенты не найдены</p>
            {search && <p className="text-sm mt-1">Попробуйте изменить запрос</p>}
          </div>
        ) : (
          <div className={cn("transition-opacity duration-150", isFetching && "opacity-50 pointer-events-none")}>
            {/* Мобильные карточки */}
            <div className="md:hidden divide-y">
              {clients.map(client => {
                const tag = LOYALTY_CONFIG[client.loyaltyTag];
                return (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    {client.photoUrl ? (
                      <img src={client.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {client.firstName[0]}{client.lastName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{client.lastName} {client.firstName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Продано: {formatMoney(client.totalSales || 0)} ₸
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{client._count.bookings} визитов</p>
                      {client.lastVisit && (
                        <p className="text-[10px] text-muted-foreground">Визит: {formatDate(client.lastVisit)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Десктопная таблица */}
            <table className="w-full hidden md:table">
              <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                <tr className="text-xs uppercase tracking-wide">
                  {renderSortHeader("Клиент", "name", "left")}
                  {renderSortHeader("Телефон", "phone", "left")}
                  {renderSortHeader("Статус", "status", "left")}
                  {renderSortHeader("Продано", "totalSales", "right")}
                  {renderSortHeader("Визиты", "visits", "right")}
                  {renderSortHeader("Посл. визит", "lastVisit", "right")}
                  {renderSortHeader("Первый визит", "firstVisit", "right")}
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {clients.map(client => {
                  const tag = LOYALTY_CONFIG[client.loyaltyTag];
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {client.photoUrl ? (
                            <img src={client.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                              {client.firstName[0]}{client.lastName[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{client.lastName} {client.firstName}</p>
                            {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{client.phone}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", tag?.className)}>
                          {tag?.label || client.loyaltyTag}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(client.totalSales || 0)} ₸
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{client._count.bookings}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {client.lastVisit ? formatDate(client.lastVisit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {client.firstVisit ? formatDate(client.firstVisit) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {total > 0 && (
        <div className="p-3 border-t bg-background shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground text-xs sm:text-sm">
            <span>
              Показано {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} из {total} клиентов
            </span>
            <div className="flex items-center gap-1.5 border-l pl-3">
              <span>На странице:</span>
              <select
                value={limit}
                onChange={e => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1 || isLoading}
              title="Первая страница"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              title="Предыдущая страница"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1.5 px-2 text-xs font-medium">
              <span>Стр.</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const val = parseInt(pageInput, 10);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setPage(val);
                    } else {
                      setPageInput(String(page));
                    }
                  }
                }}
                onBlur={() => {
                  const val = parseInt(pageInput, 10);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setPage(val);
                  } else {
                    setPageInput(String(page));
                  }
                }}
                className="h-8 w-14 rounded-md border bg-background px-1 text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span>из {totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              title="Следующая страница"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || isLoading}
              title="Последняя страница"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateClientDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { refetch(); setCreateOpen(false); }}
      />

      <AltegioImportDialog
        open={altegioOpen}
        onOpenChange={setAltegioOpen}
        onSuccess={() => { refetch(); }}
      />
    </div>
  );
}
