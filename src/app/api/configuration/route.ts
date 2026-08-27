import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateConfigSchema = z.object({
  annualBudget: z.number().nonnegative().nullable().optional(),
  weeklyHoursBuffer: z.number().nonnegative().optional(),
  saturationMin: z.number().int().min(0).max(100).optional(),
  saturationMax: z.number().int().min(0).max(100).optional(),
  saturationAlarm: z.number().int().min(0).max(100).optional(),
});

async function getOrCreateConfig() {
  let config = await prisma.bUConfiguration.findFirst();
  if (!config) {
    config = await prisma.bUConfiguration.create({ data: {} });
  }
  return config;
}

export async function GET() {
  const config = await getOrCreateConfig();
  return NextResponse.json(config);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const parsed = updateConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await getOrCreateConfig();

  const config = await prisma.bUConfiguration.update({
    where: { id: existing.id },
    data: parsed.data,
  });

  return NextResponse.json(config);
}
