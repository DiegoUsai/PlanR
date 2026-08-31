import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAndPersistAlerts } from "@/lib/business-rules/alert-engine";

export async function GET() {
  const alerts = await prisma.alert.findMany({
    where: { status: { in: ["ATTIVO", "PRESO_IN_CARICO"] } },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(alerts);
}

export async function POST() {
  const result = await generateAndPersistAlerts();
  return NextResponse.json(result);
}
