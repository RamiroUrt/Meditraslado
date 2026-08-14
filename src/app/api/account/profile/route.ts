import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

const FOTO_MAX_BYTES = 700_000;

interface PatchBody {
  nombre?: string;
  email?: string;
  fotoUrl?: string | null;
}

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: user.id },
    select: { fotoUrl: true },
  });

  return NextResponse.json({ fotoUrl: usuario.fotoUrl });
}

export async function PATCH(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body: PatchBody = await request.json();
    const nombre = body.nombre?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!nombre || !email) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    if (body.fotoUrl && body.fotoUrl.length > FOTO_MAX_BYTES) {
      return NextResponse.json({ error: "La imagen es demasiado grande (máx. ~500 KB)" }, { status: 400 });
    }

    const usuario = await prisma.usuario.update({
      where: { id: user.id },
      data: {
        nombre,
        email,
        ...(body.fotoUrl !== undefined ? { fotoUrl: body.fotoUrl } : {}),
      },
    });

    return NextResponse.json({ nombre: usuario.nombre, email: usuario.email, fotoUrl: usuario.fotoUrl });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ese email ya está en uso" }, { status: 409 });
    }
    console.error("PATCH /api/account/profile:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
 