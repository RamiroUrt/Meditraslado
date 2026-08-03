import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  nombre: string;
  rol: string;
  centroId: string | null;
  choferId: string | null;
}

export async function requireSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    nombre: session.user.name ?? "",
    rol: session.user.rol,
    centroId: session.user.centroId,
    choferId: session.user.choferId,
  };
}
