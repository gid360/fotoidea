import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    await prisma.booking.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: `Удалена запись клиента`,
        userId: session.user.id,
        clientId: booking.clientId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error deleting booking:", e);
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
