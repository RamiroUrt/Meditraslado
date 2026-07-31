import type { Role } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    rol: Role;
    centroId: string | null;
    centroNombre: string | null;
    choferId: string | null;
  }

  interface Session {
    user: {
      id: string;
      rol: Role;
      centroId: string | null;
      centroNombre: string | null;
      choferId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rol: Role;
    centroId: string | null;
    centroNombre: string | null;
    choferId: string | null;
  }
}
