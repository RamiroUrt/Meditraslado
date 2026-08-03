import { prisma } from "@/lib/prisma";

export async function registrarEvento(data: {
  mensaje: string;
  usuarioNombre?: string | null;
  pacienteId?: string | null;
  trasladoId?: string | null;
}) {
  await prisma.evento.create({
    data: {
      mensaje: data.mensaje,
      usuarioNombre: data.usuarioNombre ?? null,
      pacienteId: data.pacienteId ?? null,
      trasladoId: data.trasladoId ?? null,
    },
  });
}
