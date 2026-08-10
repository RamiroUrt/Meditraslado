import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

/**
 * Config base de NextAuth sin dependencias del runtime de Prisma.
 * El proxy (middleware) importa SOLO este archivo: con estrategia JWT solo necesita
 * leer/desencriptar la cookie de sesión, no la base de datos. El provider de Credentials
 * (que sí usa Prisma) se agrega en `auth.ts`.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
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
} satisfies NextAuthConfig;
