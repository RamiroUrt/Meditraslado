import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

interface PostBody {
  token?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body: PostBody = await request.json();
    if (!body.token || !body.password) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    if (body.password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(body.token).digest("hex");
    const usuario = await prisma.usuario.findUnique({ where: { resetTokenHash: tokenHash } });

    if (!usuario || !usuario.resetTokenExpiresAt || usuario.resetTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "El link es inválido o expiró" }, { status: 400 });
    }

    const hash = await bcrypt.hash(body.password, 10);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { password: hash, resetTokenHash: null, resetTokenExpiresAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/reset-password:", error);
    return NextResponse.json({ error: "Error al restablecer la contraseña" }, { status: 500 });
  }
}
