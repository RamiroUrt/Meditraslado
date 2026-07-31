import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
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
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
        token.centroId = user.centroId;
        token.centroNombre = user.centroNombre;
        token.choferId = user.choferId;
      }
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name;
        if (typeof session.email === "string") token.email = session.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.rol = token.rol as Role;
        session.user.centroId = token.centroId as string | null;
        session.user.centroNombre = token.centroNombre as string | null;
        session.user.choferId = token.choferId as string | null;
      }
      return session;
    },
  },
});
