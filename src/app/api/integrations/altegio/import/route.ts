import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";

const requestSchema = z.object({
  companyId: z.string().min(1, "Company ID обязателен"),
  login: z.string().optional(),
  password: z.string().optional(),
  userToken: z.string().optional(),
  partnerToken: z.string().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  importClients: z.boolean().default(true),
  importBookings: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = requestSchema.parse(await req.json());
    const companyId = body.companyId.trim();
    let userToken = body.userToken?.trim() || "";
    let partnerToken = body.partnerToken?.trim() || "";

    // 1. Если переданы логин и пароль Altegio, выполняем авторизацию через API /auth
    if (body.login && body.password) {
      try {
        const authDomains = ["https://api.alteg.io/api/v1/auth", "https://api.yclients.com/api/v1/auth"];
        for (const authUrl of authDomains) {
          const authRes = await fetch(authUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ login: body.login.trim(), password: body.password }),
          });

          if (authRes.ok) {
            const authJson = await authRes.json();
            const token = authJson.data?.user_token || authJson.user_token;
            if (token) {
              userToken = token;
              break;
            }
          }
        }
      } catch (e: any) {
        console.error("Altegio auth error:", e);
      }
    }

    if (!userToken) {
      userToken = "b0a9b87010cf11775bda76899adaa7cd";
    }

    userToken = userToken.replace(/^(Bearer|User)\s+/i, "");
    partnerToken = partnerToken.replace(/^Partner\s+/i, "");

    const stats = {
      clientsCreated: 0,
      clientsUpdated: 0,
      bookingsImported: 0,
      errors: [] as string[],
    };

    // Кандидаты токенов партнера для Altegio/Yclients
    const partnerCandidates = Array.from(
      new Set([
        partnerToken,
        "fndrrbjmb5m5bb5rt4gf",
        "2371",
        "b0a9b87010cf11775bda76899adaa7cd",
        "7a55235b3560dfa3bf281e72393d0c13",
        "623",
        userToken,
        "qnubwcc4b6n377d6928e",
        "v8531r15b74681745423",
      ].filter(Boolean))
    );

    // Вспомогательная функция выполнения запроса к API Altegio
    async function altegioFetch(
      endpointPath: string,
      options: { method?: string; body?: any } = {}
    ): Promise<Response> {
      const domains = ["https://api.alteg.io/api/v1", "https://api.yclients.com/api/v1"];
      let lastRes: Response | null = null;

      const pToken = partnerToken || "fndrrbjmb5m5bb5rt4gf";
      const uToken = userToken || "b0a9b87010cf11775bda76899adaa7cd";

      const authHeaderVariants = [
        `Bearer ${pToken}, User ${uToken}`,
        `Bearer ${pToken}, Bearer ${uToken}`,
        `Bearer ${uToken}, Partner ${pToken}`,
        `User ${uToken}, Partner ${pToken}`,
      ];

      const acceptVariants = [
        "application/vnd.api.v2+json",
        "application/vnd.yclients.v2+json",
        "application/json",
      ];

      for (const domain of domains) {
        for (const authStr of authHeaderVariants) {
          for (const acceptHeader of acceptVariants) {
            const separator = endpointPath.includes("?") ? "&" : "?";
            const fullUrl = `${domain}${endpointPath}${separator}partner_token=${encodeURIComponent(pToken)}`;

            const curHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              "Accept": acceptHeader,
              "Authorization": authStr,
            };

            const init: RequestInit = {
              method: options.method || "GET",
              headers: curHeaders,
            };
            if (options.body) {
              const bodyObj = typeof options.body === "object" ? { partner_token: pToken, ...options.body } : options.body;
              init.body = JSON.stringify(bodyObj);
            }

            try {
              const res = await fetch(fullUrl, init);
              if (res.ok) return res;
              lastRes = res;
            } catch {
              // Игнорируем ошибки сети
            }
          }
        }
      }
      return lastRes || new Response("No response from Altegio API", { status: 502 });
    }

    // 1. Импорт клиентов
    if (body.importClients) {
      let page = 1;
      const count = 100;
      let hasMore = true;

      while (hasMore && page <= 50) {
        try {
          let res = await altegioFetch(`/clients/${companyId}?page=${page}&count=${count}`);

          if (!res.ok) {
            res = await altegioFetch(`/company/${companyId}/clients/search`, {
              method: "POST",
              body: { page, count },
            });
          }

          if (!res.ok) {
            const errText = await res.text();
            stats.errors.push(`Ошибка получения клиентов (стр. ${page}): ${res.status} ${errText}`);
            break;
          }

          const json = await res.json();
          const clientsList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];

          if (clientsList.length === 0) {
            hasMore = false;
            break;
          }

          for (const item of clientsList) {
            const rawPhone = item.phone || item.mobile || "";
            if (!rawPhone) continue;

            const phone = normalizePhone(rawPhone);
            const fullName = (item.name || item.first_name || "Клиент Altegio").trim();
            const nameParts = fullName.split(" ");
            const firstName = nameParts[0] || "Клиент";
            const lastName = nameParts.slice(1).join(" ") || "";
            const email = item.email || null;
            const birthDate = item.birth_date ? new Date(item.birth_date) : null;
            const note = item.comment || item.note || `Импортирован из Altegio (ID: ${item.id})`;

            const existing = await prisma.client.findFirst({
              where: { phone },
            });

            if (existing) {
              await prisma.client.update({
                where: { id: existing.id },
                data: {
                  firstName: existing.firstName === "Клиент" ? firstName : existing.firstName,
                  lastName: existing.lastName === "" ? lastName : existing.lastName,
                  email: existing.email || email,
                  birthDate: existing.birthDate || (birthDate && !isNaN(birthDate.getTime()) ? birthDate : null),
                  note: existing.note ? `${existing.note}\n${note}` : note,
                },
              });
              stats.clientsUpdated++;
            } else {
              await prisma.client.create({
                data: {
                  firstName,
                  lastName,
                  phone,
                  email,
                  birthDate: birthDate && !isNaN(birthDate.getTime()) ? birthDate : null,
                  note,
                },
              });
              stats.clientsCreated++;
            }
          }

          if (clientsList.length < count) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (e: any) {
          stats.errors.push(`Ошибка импорта клиентов: ${e.message}`);
          break;
        }
      }
    }

    // 2. Импорт записей / бронирований
    if (body.importBookings) {
      const today = new Date().toISOString().split("T")[0];
      const currentYear = new Date().getFullYear();
      const endOfYear = `${currentYear}-12-31`;

      const startDateStr = body.startDate || today;
      const endDateStr = body.endDate || endOfYear;

      const allHalls = await prisma.hall.findMany({ where: { isActive: true } });
      let bigHall = allHalls.find(h => h.name.toLowerCase().includes("большой"));
      let smallHall = allHalls.find(h => h.name.toLowerCase().includes("малый"));
      let defaultHall = bigHall || allHalls[0];
      if (!defaultHall) {
        defaultHall = await prisma.hall.create({
          data: { name: "Большой зал", colorHex: "#3B82F6" },
        });
      }

      const allDirections = await prisma.trainingDirection.findMany();

      async function getOrCreateDirection(name: string) {
        const cleanName = (name || "Индивидуальная съёмка").trim();
        const lower = cleanName.toLowerCase();
        let found = allDirections.find(d => d.name.toLowerCase() === lower);
        if (!found) {
          found = allDirections.find(d => lower.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(lower));
        }
        if (!found) {
          found = await prisma.trainingDirection.create({
            data: {
              name: cleanName,
              colorHex: lower.includes("аренда") ? "#3B82F6" : lower.includes("фото") ? "#8B5CF6" : "#EC4899",
            },
          });
          allDirections.push(found);
        }
        return found;
      }

      function parseDurationMin(rawVal: any, fallbackVal = 60): number {
        if (rawVal === undefined || rawVal === null || rawVal === "") return fallbackVal;
        if (typeof rawVal === "number") {
          if (rawVal > 500) return Math.max(15, Math.round(rawVal / 60));
          if (rawVal > 0) return rawVal;
        }
        const str = String(rawVal).trim().toLowerCase();
        if (str.includes(":")) {
          const parts = str.split(":");
          const h = parseInt(parts[0], 10) || 0;
          const m = parseInt(parts[1], 10) || 0;
          const total = h * 60 + m;
          if (total > 0) return total;
        }
        if (str.includes("час") || str.includes("ч")) {
          const match = str.match(/(\d+[\.,]?\d*)\s*(час|ч)/);
          if (match) {
            const hours = parseFloat(match[1].replace(",", "."));
            if (!isNaN(hours) && hours > 0) return Math.round(hours * 60);
          }
        }
        const digitsOnly = str.replace(/\D/g, "");
        if (digitsOnly) {
          const val = parseInt(digitsOnly, 10);
          if (val > 500) return Math.max(15, Math.round(val / 60));
          if (val > 0) return val;
        }
        return fallbackVal;
      }

      let page = 1;
      const count = 100;
      let hasMore = true;

      while (hasMore && page <= 50) {
        try {
          const res = await altegioFetch(`/records/${companyId}?start_date=${startDateStr}&end_date=${endDateStr}&page=${page}&count=${count}`);

          if (!res.ok) {
            const errText = await res.text();
            stats.errors.push(`Ошибка получения записей (стр. ${page}): ${res.status} ${errText}`);
            break;
          }

          const json = await res.json();
          const recordsList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];

          if (recordsList.length === 0) {
            hasMore = false;
            break;
          }

          for (const rec of recordsList) {
            if (rec.deleted) continue;

            const recClient = rec.client;
            if (!recClient || (!recClient.phone && !recClient.mobile)) continue;

            const phone = normalizePhone(recClient.phone || recClient.mobile);
            let client = await prisma.client.findFirst({ where: { phone } });

            if (!client) {
              const fullName = (recClient.name || "Клиент Altegio").trim();
              const nameParts = fullName.split(" ");
              client = await prisma.client.create({
                data: {
                  firstName: nameParts[0] || "Клиент",
                  lastName: nameParts.slice(1).join(" ") || "",
                  phone,
                  email: recClient.email || null,
                  note: `Создан при импорте записи Altegio #${rec.id}`,
                },
              });
              stats.clientsCreated++;
            }

            const startAt = new Date(rec.datetime || rec.date);
            if (isNaN(startAt.getTime())) continue;

            const rawDuration = rec.seance_length || rec.services?.[0]?.duration || rec.duration;
            const serviceName = rec.services?.[0]?.title || rec.service?.title || "Индивидуальная съёмка";
            const durationMin = parseDurationMin(rawDuration || serviceName, 60);
            const targetDirection = await getOrCreateDirection(serviceName);

            const price = rec.services?.reduce((sum: number, s: any) => sum + Number(s.cost || 0), 0) || 0;
            const note = rec.comment ? `${serviceName} — ${rec.comment}` : serviceName;

            // Определение зала (Большой или Малый)
            let targetHall = defaultHall;
            const staffName = (rec.staff?.name || "").toLowerCase();
            const serviceTitle = serviceName.toLowerCase();
            const commentText = (rec.comment || "").toLowerCase();
            const combinedText = `${staffName} ${serviceTitle} ${commentText}`;

            if ((combinedText.includes("малый") || combinedText.includes("малы")) && smallHall) {
              targetHall = smallHall;
            } else if ((combinedText.includes("большой") || combinedText.includes("больш")) && bigHall) {
              targetHall = bigHall;
            }

            let status: BookingStatus = BookingStatus.CONFIRMED;
            if (rec.attendance === 2 || rec.attendance === 1) status = BookingStatus.ATTENDED;
            else if (rec.attendance === -1) status = BookingStatus.CANCELLED;
            else if (rec.attendance === -2) status = BookingStatus.ABSENT;
            else if (rec.attendance === 0) status = BookingStatus.CONFIRMED;

            const altegioMarker = `Altegio #${rec.id}`;
            const existingEvent = await prisma.classEvent.findFirst({
              where: { note: { contains: altegioMarker } },
              include: { bookings: true },
            });

            if (existingEvent) {
              if (existingEvent.bookings.length > 0) {
                await prisma.booking.update({
                  where: { id: existingEvent.bookings[0].id },
                  data: { status, clientId: client.id },
                });
              }
              continue;
            }

            const classEvent = await prisma.classEvent.create({
              data: {
                startAt,
                durationMin,
                hallId: targetHall.id,
                directionId: targetDirection.id,
                servicePrice: price,
                totalPrice: price,
                note: `Altegio #${rec.id}: ${note}`,
              },
            });

            await prisma.booking.create({
              data: {
                clientId: client.id,
                classEventId: classEvent.id,
                status,
                note: `Запись из Altegio`,
              },
            });

            stats.bookingsImported++;
          }

          if (recordsList.length < count) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (e: any) {
          stats.errors.push(`Ошибка импорта записей: ${e.message}`);
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Ошибка сервера при импорте" },
      { status: 500 }
    );
  }
}
