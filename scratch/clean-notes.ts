import { prisma } from "../src/lib/prisma";

function dedupeNote(noteStr: string | null | undefined): string | null {
  if (!noteStr || !noteStr.trim()) return null;

  const lines = noteStr.split("\n").map(l => l.trim()).filter(Boolean);
  const uniqueLines: string[] = [];

  for (const line of lines) {
    let cleanLine = line;
    const phrase = "Импортирован из Altegio";
    if (cleanLine.includes(phrase)) {
      const remaining = cleanLine.replaceAll(phrase, "").trim();
      cleanLine = remaining ? `${phrase} ${remaining}` : phrase;
    }

    if (!uniqueLines.some(ul => ul === cleanLine || ul.includes(cleanLine))) {
      uniqueLines.push(cleanLine);
    }
  }

  return uniqueLines.join("\n").trim() || null;
}

async function main() {
  const clients = await prisma.client.findMany({
    where: { note: { not: null } },
  });

  console.log(`Found ${clients.length} clients with notes`);

  let updatedCount = 0;
  for (const c of clients) {
    if (!c.note) continue;
    const cleaned = dedupeNote(c.note);
    if (cleaned !== c.note) {
      console.log(`Cleaning note for client ${c.firstName} ${c.lastName}:`);
      console.log(`BEFORE: ${c.note}`);
      console.log(`AFTER: ${cleaned}`);
      await prisma.client.update({
        where: { id: c.id },
        data: { note: cleaned },
      });
      updatedCount++;
    }
  }

  console.log(`Cleaned notes for ${updatedCount} clients.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
