import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PRESO_IN_CARICO", "SILENZIATO", "RISOLTO"]),
  silenceReason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) {
    return NextResponse.json({ error: "Alert non trovato" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, silenceReason } = parsed.data;

  if (status === "SILENZIATO" && !silenceReason) {
    return NextResponse.json(
      { error: "Motivazione obbligatoria per silenziare un alert" },
      { status: 400 }
    );
  }

  const updated = await prisma.alert.update({
    where: { id },
    data: {
      status: status as never,
      silenceReason: status === "SILENZIATO" ? silenceReason : undefined,
      resolvedAt: status === "RISOLTO" ? new Date() : undefined,
    },
  });

  return NextResponse.json(updated);
}
