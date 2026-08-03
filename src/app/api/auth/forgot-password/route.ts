import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { enviarEmailResetPassword } from "@/lib/email";

interface PostBody {
  email?: string;
}

const MENSAJE_GENERICO = {
  ok: true,
  message: "Si el email existe, te enviamos un link para restablecer tu contraseña.",
};

export async function POST(request: Request) {
  try {
    const body: PostBody = await request.json();
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Falta el email" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
      });

      const baseUrl = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await enviarEmailResetPassword(usuario.email, resetUrl);
    }

    return NextResponse.json(MENSAJE_GENERICO);
  } catch (error) {
    console.error("POST /api/auth/forgot-password:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
