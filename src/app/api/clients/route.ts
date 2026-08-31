import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contracts: true } } },
  });
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Nome cliente obbligatorio" },
      { status: 400 }
    );
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json(
      { error: "Nome cliente non valido" },
      { status: 400 }
    );
  }

  const existing = await prisma.client.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(existing);
  }

  const client = await prisma.client.create({
    data: { slug, name, notes: body.notes || null },
  });

  return NextResponse.json(client, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug richiesto" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { slug },
    include: { _count: { select: { contracts: true } } },
  });

  if (!client) {
    return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 });
  }

  if (client._count.contracts > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: ${client._count.contracts} contratti associati` },
      { status: 409 }
    );
  }

  await prisma.client.delete({ where: { slug } });
  return NextResponse.json({ deleted: true });
}
