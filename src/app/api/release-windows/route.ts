import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createReleaseWindowSchema = z.object({
  applicationId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");

  const where: Record<string, unknown> = {};
  if (applicationId) where.applicationId = applicationId;

  const windows = await prisma.releaseWindow.findMany({
    where,
    include: { application: true },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(windows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createReleaseWindowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { startDate, endDate, ...data } = parsed.data;

  const window = await prisma.releaseWindow.create({
    data: {
      ...data,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    include: { application: true },
  });

  return NextResponse.json(window, { status: 201 });
}
