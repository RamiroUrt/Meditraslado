import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { centro: true, chofer: true },
        });
        if (!usuario) return null;

        const valido = await bcrypt.compare(password, usuario.password);
        if (!valido) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          rol: usuario.rol,
          centroId: usuario.centroId,
          centroNombre: usuario.centro?.nombre ?? null,
          choferId: usuario.chofer?.id ?? null,
        };
      },
    }),
  ],
});
