import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createModuleSchema = z.object({
  applicationId: z.string().uuid(),
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");

  const where: Record<string, unknown> = {};
  if (applicationId) where.applicationId = applicationId;

  const modules = await prisma.module.findMany({
    where,
    include: { application: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(modules);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createModuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const module = await prisma.module.create({
    data: parsed.data,
    include: { application: true },
  });

  return NextResponse.json(module, { status: 201 });
}
