import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

interface PatchBody {
  passwordActual?: string;
  passwordNueva?: string;
}

export async function PATCH(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body: PatchBody = await request.json();
    if (!body.passwordActual || !body.passwordNueva) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    if (body.passwordNueva.length < 6) {
      return NextResponse.json({ error: "La contraseña nueva debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: user.id } });
    const valido = await bcrypt.compare(body.passwordActual, usuario.password);
    if (!valido) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 401 });
    }

    const hash = await bcrypt.hash(body.passwordNueva, 10);
    await prisma.usuario.update({ where: { id: user.id }, data: { password: hash } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/account/password:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
