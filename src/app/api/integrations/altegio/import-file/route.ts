import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";
import { BookingStatus } from "@prisma/client";
import * as XLSX from "xlsx";

function combineNotes(existingNote?: string | null, newNote?: string | null): string | null {
  if (!existingNote && !newNote) return null;
  if (!existingNote) return newNote ? newNote.trim() : null;
  if (!newNote || !newNote.trim()) return existingNote;

  const existingStr = existingNote.trim();
  const newStr = newNote.trim();

  if (existingStr.includes(newStr)) return existingStr;
  if (newStr.includes(existingStr)) return newStr;

  return `${existingStr}\n${newStr}`;
}

function parseExcelDateTime(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d;
  }
  const s = String(val).trim();
  if (!s) return null;

  const match = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 10;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const d = new Date(year, month, day, hours, minutes);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function extractDigits(val: any): string {
  if (!val) return "";
  return String(val).replace(/\D/g, "");
}

function parseInteger(val: any): number {
  if (typeof val === "number") return Math.floor(val);
  if (!val) return 0;
  const num = parseInt(String(val).replace(/\D/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "clients";

    if (!file) {
      return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json({ error: "Файл пуст или повреждён" }, { status: 400 });
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: "Файл не содержит данных" }, { status: 400 });
    }

    // 1. Поиск строки заголовков
    let headerRowIdx = -1;
    let maxMatchCount = 0;

    for (let i = 0; i < Math.min(20, rawRows.length); i++) {
      const row = rawRows[i].map(c => String(c || "").trim().toLowerCase());
      let matchCount = 0;
      for (const cell of row) {
        if (
          cell.includes("имя") ||
          cell.includes("фио") ||
          cell.includes("клиент") ||
          cell.includes("телефон") ||
          cell.includes("тел") ||
          cell.includes("номер") ||
          cell.includes("мобильный") ||
          cell.includes("сотовый") ||
          cell.includes("phone") ||
          cell.includes("name") ||
          cell.includes("email") ||
          cell.includes("почта") ||
          cell.includes("дата") ||
          cell.includes("визит") ||
          cell.includes("сеанс") ||
          cell.includes("примечание") ||
          cell.includes("комментарий")
        ) {
          matchCount++;
        }
      }
      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        headerRowIdx = i;
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 0;
    }

    const headers = rawRows[headerRowIdx].map(h => String(h || "").trim().toLowerCase());

    const stats = {
      created: 0,
      updated: 0,
      totalRowsProcessed: 0,
      errors: [] as string[],
    };

    if (type === "clients") {
      // 2. Детектирование колонок для Клиентов
      let nameIdx = headers.findIndex(h =>
        h.includes("имя") || h.includes("фио") || h.includes("клиент") || h.includes("наименование") || h.includes("name") || h.includes("фамилия")
      );
      let phoneIdx = headers.findIndex(h =>
        h.includes("телефон") || h.includes("тел") || h.includes("номер") || h.includes("мобильный") || h.includes("сотовый") || h.includes("phone") || h.includes("mobile") || h.includes("контакт")
      );
      let emailIdx = headers.findIndex(h => h.includes("email") || h.includes("почта") || h.includes("e-mail"));
      let birthIdx = headers.findIndex(h => h.includes("рождения") || h.includes("birth") || h.includes("рождение") || h.includes("др"));
      let noteIdx = headers.findIndex(h => h.includes("примечание") || h.includes("комментарий") || h.includes("note") || h.includes("заметка") || h.includes("информация") || h.includes("категория"));

      let firstVisitIdx = headers.findIndex(h =>
        h.includes("первый визит") || h.includes("первое посещение") || h.includes("первая запись") ||
        h.includes("first visit") || h.includes("first_visit") ||
        (h.includes("перв") && (h.includes("визит") || h.includes("посещ")))
      );

      let lastVisitIdx = headers.findIndex(h =>
        h.includes("последний визит") || h.includes("последнее посещение") || h.includes("последняя запись") ||
        h.includes("last visit") || h.includes("last_visit") ||
        (h.includes("посл") && (h.includes("визит") || h.includes("посещ")))
      );

      let visitsCountIdx = headers.findIndex(h =>
        h.includes("количество посещений") || h.includes("кол-во посещений") ||
        h.includes("количество визитов") || h.includes("кол-во визитов") ||
        h.includes("число визитов") || h.includes("число посещений") ||
        h.includes("visits count") || h.includes("visits_count") ||
        (h.includes("кол") && (h.includes("визит") || h.includes("посещ"))) ||
        (h.includes("колич") && (h.includes("визит") || h.includes("посещ"))) ||
        (h.includes("число") && (h.includes("визит") || h.includes("посещ")))
      );

      let defaultHall: any = null;
      let defaultDirection: any = null;

      // Кэшируем существующих клиентов для мгновенного поиска O(1) и исключения вызовов SQL в цикле
      const existingClientsList = await prisma.client.findMany({
        select: { id: true, phone: true, firstName: true, lastName: true, email: true, birthDate: true, note: true, createdAt: true, firstVisit: true, lastVisit: true },
      });

      const phoneMap = new Map<string, typeof existingClientsList[0]>();
      const nameMap = new Map<string, typeof existingClientsList[0]>();

      for (const c of existingClientsList) {
        if (c.phone && !c.phone.startsWith("+7000")) {
          phoneMap.set(c.phone, c);
        }
        if (c.lastName && c.lastName.trim() !== "") {
          const nameKey = `${c.firstName.trim().toLowerCase()}|${c.lastName.trim().toLowerCase()}`;
          nameMap.set(nameKey, c);
        }
      }

      // Если phoneIdx не найден в заголовках, сканируем первые 30 строк данных для автоопределения колонки телефона
      if (phoneIdx === -1) {
        const colScores: Record<number, number> = {};
        for (let i = headerRowIdx + 1; i < Math.min(headerRowIdx + 30, rawRows.length); i++) {
          const row = rawRows[i];
          row.forEach((cell, colIdx) => {
            const digits = extractDigits(cell);
            if (digits.length >= 10 && digits.length <= 13) {
              colScores[colIdx] = (colScores[colIdx] || 0) + 1;
            }
          });
        }
        let bestCol = -1;
        let bestScore = 0;
        Object.entries(colScores).forEach(([colStr, score]) => {
          if (score > bestScore) {
            bestScore = score;
            bestCol = Number(colStr);
          }
        });
        if (bestCol >= 0) {
          phoneIdx = bestCol;
        }
      }

      // Если nameIdx не найден в заголовках, выбираем первую текстовую колонку без цифр
      if (nameIdx === -1) {
        for (let colIdx = 0; colIdx < headers.length; colIdx++) {
          if (colIdx !== phoneIdx) {
            nameIdx = colIdx;
            break;
          }
        }
      }

      // 3. Обработка всех строк клиентов
      for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i].map(c => String(c ?? "").trim());
        if (row.length === 0 || row.every(c => c === "")) continue;

        stats.totalRowsProcessed++;

        // Поиск телефона: сначала из phoneIdx, затем сканированием всей строки
        let rawPhone = phoneIdx >= 0 && row[phoneIdx] ? row[phoneIdx] : "";
        if (!rawPhone) {
          for (const cell of row) {
            const digits = extractDigits(cell);
            if (digits.length >= 10 && digits.length <= 13) {
              rawPhone = cell;
              break;
            }
          }
        }

        // Поиск имени: сначала из nameIdx, затем сканированием текстовых ячеек
        let fullName = nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : "";
        if (!fullName) {
          for (let c = 0; c < row.length; c++) {
            if (c !== phoneIdx && row[c] && extractDigits(row[c]).length < 6) {
              fullName = row[c];
              break;
            }
          }
        }

        if (!rawPhone && !fullName) continue;

        const isRealPhone = Boolean(rawPhone);
        const phone = isRealPhone ? normalizePhone(rawPhone) : `+7000${String(i).padStart(7, "0")}`;
        const cleanFullName = (fullName || "Клиент").trim();
        const nameParts = cleanFullName.split(" ");
        const firstName = nameParts[0] || "Клиент";
        const lastName = nameParts.slice(1).join(" ") || "";
        const email = emailIdx >= 0 && row[emailIdx] ? row[emailIdx] : null;
        const note = noteIdx >= 0 && row[noteIdx] ? row[noteIdx] : "Импортирован из Altegio";

        let birthDate: Date | null = null;
        if (birthIdx >= 0 && rawRows[i][birthIdx]) {
          birthDate = parseExcelDateTime(rawRows[i][birthIdx]);
        }

        let firstVisit: Date | null = null;
        if (firstVisitIdx >= 0 && rawRows[i][firstVisitIdx]) {
          firstVisit = parseExcelDateTime(rawRows[i][firstVisitIdx]);
        }

        let lastVisit: Date | null = null;
        if (lastVisitIdx >= 0 && rawRows[i][lastVisitIdx]) {
          lastVisit = parseExcelDateTime(rawRows[i][lastVisitIdx]);
        }

        let visitsCount = 0;
        if (visitsCountIdx >= 0 && rawRows[i][visitsCountIdx]) {
          visitsCount = parseInteger(rawRows[i][visitsCountIdx]);
        }

        try {
          // Телефон — единственный уникальный идентификатор клиента
          let existing: typeof existingClientsList[0] | undefined = undefined;

          if (isRealPhone) {
            existing = phoneMap.get(phone);
          }

          let client: any;

          if (existing) {
            client = await prisma.client.update({
              where: { id: existing.id },
              data: {
                firstName: existing.firstName === "Клиент" ? firstName : existing.firstName,
                lastName: existing.lastName === "" ? lastName : existing.lastName,
                email: existing.email || email,
                birthDate: existing.birthDate || birthDate,
                note: combineNotes(existing.note, note),
                firstVisit: firstVisit || existing.firstVisit,
                lastVisit: lastVisit || existing.lastVisit,
                ...(firstVisit && (!existing.createdAt || firstVisit < existing.createdAt) ? { createdAt: firstVisit } : {}),
              },
            });

            // Обновляем кэш
            const updatedCacheItem = { ...existing, ...client };
            if (isRealPhone) phoneMap.set(phone, updatedCacheItem);
            if (lastName.trim() !== "") {
              nameMap.set(`${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`, updatedCacheItem);
            }
            stats.updated++;
          } else {
            client = await prisma.client.create({
              data: {
                firstName,
                lastName,
                phone,
                email,
                birthDate,
                note,
                firstVisit,
                lastVisit,
                ...(firstVisit ? { createdAt: firstVisit } : {}),
              },
            });

            // Добавляем в кэш
            if (isRealPhone) phoneMap.set(phone, client);
            if (lastName.trim() !== "") {
              nameMap.set(`${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`, client);
            }
            stats.created++;
          }

          // Создаем бронирования для отображения первого/последнего визита и количества посещений
          let targetVisits = visitsCount;
          if (targetVisits === 0) {
            if (firstVisit && lastVisit && firstVisit.getTime() !== lastVisit.getTime()) {
              targetVisits = 2;
            } else if (firstVisit || lastVisit) {
              targetVisits = 1;
            }
          }

          if (targetVisits > 0) {
            const existingCount = await prisma.booking.count({
              where: { clientId: client.id, status: { not: "CANCELLED" } },
            });
            const neededVisits = Math.max(0, targetVisits - existingCount);
            const visitsToGenerate = Math.min(neededVisits, 300);

            if (visitsToGenerate > 0) {
              if (!defaultHall) {
                defaultHall = await prisma.hall.findFirst({ where: { isActive: true } });
                if (!defaultHall) {
                  defaultHall = await prisma.hall.create({ data: { name: "Основной зал", colorHex: "#3B82F6" } });
                }
              }
              if (!defaultDirection) {
                defaultDirection = await prisma.trainingDirection.findFirst({ where: { isActive: true } });
                if (!defaultDirection) {
                  defaultDirection = await prisma.trainingDirection.create({ data: { name: "Съёмка", colorHex: "#8B5CF6" } });
                }
              }

              const startDate = firstVisit || lastVisit || new Date();
              const endDate = lastVisit || firstVisit || startDate;
              const startMs = startDate.getTime();
              const endMs = endDate.getTime();

              for (let v = 0; v < visitsToGenerate; v++) {
                let visitDate: Date;
                if (visitsToGenerate === 1) {
                  visitDate = endDate;
                } else {
                  const progress = v / (visitsToGenerate - 1);
                  visitDate = new Date(startMs + progress * (endMs - startMs));
                }

                const classEvent = await prisma.classEvent.create({
                  data: {
                    startAt: visitDate,
                    durationMin: 60,
                    hallId: defaultHall.id,
                    directionId: defaultDirection.id,
                    note: "Импортировано из файла клиентов",
                  },
                });

                await prisma.booking.create({
                  data: {
                    clientId: client.id,
                    classEventId: classEvent.id,
                    status: BookingStatus.ATTENDED,
                    note: "История посещений из импорта клиентов",
                  },
                });
              }
            }
          }
        } catch (e: any) {
          stats.errors.push(`Строка ${i + 1}: ${e.message}`);
        }
      }
    } else {
      // 2. Детектирование колонок для Истории посещений / Бронирований
      let dateIdx = headers.findIndex(h => h.includes("дата") || h.includes("время") || h.includes("date") || h.includes("визит") || h.includes("сеанс"));
      let phoneIdx = headers.findIndex(h => h.includes("телефон") || h.includes("тел") || h.includes("номер") || h.includes("мобильный") || h.includes("phone"));
      let nameIdx = headers.findIndex(h => h.includes("клиент") || h.includes("имя") || h.includes("фио") || h.includes("name"));
      let serviceIdx = headers.findIndex(h => h.includes("услуга") || h.includes("занятие") || h.includes("направление") || h.includes("service"));
      let priceIdx = headers.findIndex(h => h.includes("сумма") || h.includes("стоимость") || h.includes("цена") || h.includes("оплачено") || h.includes("price"));
      let durationIdx = headers.findIndex(h => h.includes("длительность") || h.includes("минут") || h.includes("duration"));
      let statusIdx = headers.findIndex(h => h.includes("статус") || h.includes("состояние") || h.includes("визит"));
      let hallIdx = headers.findIndex(h => h.includes("зал") || h.includes("ресурс") || h.includes("мастер") || h.includes("сотрудник") || h.includes("hall") || h.includes("room"));

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

      for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i].map(c => String(c ?? "").trim());
        if (row.length === 0 || row.every(c => c === "")) continue;

        stats.totalRowsProcessed++;

        const rawDate = dateIdx >= 0 ? rawRows[i][dateIdx] : "";
        if (!rawDate) continue;

        const startAt = parseExcelDateTime(rawDate);
        if (!startAt) continue;

        let rawPhone = phoneIdx >= 0 ? row[phoneIdx] : "";
        if (!rawPhone) {
          for (const cell of row) {
            const digits = extractDigits(cell);
            if (digits.length >= 10 && digits.length <= 13) {
              rawPhone = cell;
              break;
            }
          }
        }

        const phone = rawPhone ? normalizePhone(rawPhone) : `+7000${String(i).padStart(7, "0")}`;
        let client = await prisma.client.findFirst({ where: { phone } });

        if (!client) {
          const fullName = nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : "Клиент";
          const nameParts = fullName.trim().split(" ");
          client = await prisma.client.create({
            data: {
              firstName: nameParts[0] || "Клиент",
              lastName: nameParts.slice(1).join(" ") || "",
              phone,
              note: "Создан при импорте истории из Excel",
            },
          });
          stats.updated++;
        }

        const price = priceIdx >= 0 && row[priceIdx] ? Number(String(row[priceIdx]).replace(/\D/g, "")) || 0 : 0;
        const serviceName = serviceIdx >= 0 && row[serviceIdx] ? row[serviceIdx] : "Индивидуальная съёмка";

        const rawDurationCell = durationIdx >= 0 ? row[durationIdx] : "";
        const durationMin = parseDurationMin(rawDurationCell || serviceName, 60);
        const targetDirection = await getOrCreateDirection(serviceName);

        // Определение зала (Большой или Малый)
        let targetHall = defaultHall;
        const rowStr = row.join(" ").toLowerCase();

        if (hallIdx >= 0 && row[hallIdx]) {
          const hText = row[hallIdx].toLowerCase();
          if ((hText.includes("малый") || hText.includes("малы")) && smallHall) {
            targetHall = smallHall;
          } else if ((hText.includes("большой") || hText.includes("больш")) && bigHall) {
            targetHall = bigHall;
          }
        } else {
          if ((rowStr.includes("малый") || rowStr.includes("малы")) && smallHall) {
            targetHall = smallHall;
          } else if ((rowStr.includes("большой") || rowStr.includes("больш")) && bigHall) {
            targetHall = bigHall;
          }
        }

        let status: BookingStatus = BookingStatus.CONFIRMED;
        if (statusIdx >= 0 && row[statusIdx]) {
          const st = String(row[statusIdx]).toLowerCase();
          if (st.includes("пришел") || st.includes("состоял") || st.includes("посетил") || st.includes("выполнен")) {
            status = BookingStatus.ATTENDED;
          } else if (st.includes("отмен") || st.includes("отказ")) {
            status = BookingStatus.CANCELLED;
          } else if (st.includes("не пришел") || st.includes("пропущ")) {
            status = BookingStatus.ABSENT;
          }
        }

        const classEvent = await prisma.classEvent.create({
          data: {
            startAt,
            durationMin,
            hallId: targetHall.id,
            directionId: targetDirection.id,
            servicePrice: price,
            totalPrice: price,
            note: `История Altegio: ${serviceName}`,
          },
        });

        await prisma.booking.create({
          data: {
            clientId: client.id,
            classEventId: classEvent.id,
            status,
            note: "Импортировано из файла Excel",
          },
        });

        stats.created++;
      }
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Ошибка обработки Excel файла" }, { status: 500 });
  }
}
