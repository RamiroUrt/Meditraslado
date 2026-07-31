import { PrismaClient, Role, EstadoTraslado, type Chofer, type DiaSemana } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { generarPacientes } from "./pacientes-data";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const DIA_POR_INDICE: DiaSemana[] = [
  "DOMINGO",
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
];

function toDateOnly(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

async function main() {
  await prisma.evento.deleteMany();
  await prisma.traslado.deleteMany();
  await prisma.pacienteCita.deleteMany();
  await prisma.pacienteHorario.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.chofer.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.centro.deleteMany();

  const [kineKids, kineAdults, pileta, geriatrico] = await Promise.all([
    prisma.centro.create({ data: { nombre: "Kine niños" } }),
    prisma.centro.create({ data: { nombre: "Kine adultos" } }),
    prisma.centro.create({ data: { nombre: "Pileta" } }),
    prisma.centro.create({ data: { nombre: "Geriátrico" } }),
  ]);

  const password = await bcrypt.hash("123456", 10);

  await prisma.usuario.create({
    data: { email: "admin@meditraslado.com", password, nombre: "Dr. Ramiro", rol: Role.ADMIN },
  });
  await prisma.usuario.createMany({
    data: [
      {
        email: "recepcion@meditraslado.com",
        password,
        nombre: "Recepción Kine Niños",
        rol: Role.RECEPCIONISTA,
        centroId: kineKids.id,
      },
      {
        email: "recepcion.kineadultos@meditraslado.com",
        password,
        nombre: "Recepción Kine Adultos",
        rol: Role.RECEPCIONISTA,
        centroId: kineAdults.id,
      },
      {
        email: "recepcion.pileta@meditraslado.com",
        password,
        nombre: "Recepción Pileta",
        rol: Role.RECEPCIONISTA,
        centroId: pileta.id,
      },
      {
        email: "recepcion.geriatrico@meditraslado.com",
        password,
        nombre: "Recepción Geriátrico",
        rol: Role.RECEPCIONISTA,
        centroId: geriatrico.id,
      },
    ],
  });

  const choferesDef = [
    { email: "carlos.mendez@meditraslado.com", nombre: "Carlos Méndez" },
    { email: "roberto.s@meditraslado.com", nombre: "Roberto S." },
    { email: "diego.fernandez@meditraslado.com", nombre: "Diego Fernández" },
    { email: "alejandro.paz@meditraslado.com", nombre: "Alejandro Paz" },
    { email: "walter.gimenez@meditraslado.com", nombre: "Walter Giménez" },
  ];

  const choferes: Chofer[] = [];
  for (const c of choferesDef) {
    const usuario = await prisma.usuario.create({
      data: { email: c.email, password, nombre: c.nombre, rol: Role.CHOFER },
    });
    const chofer = await prisma.chofer.create({ data: { usuarioId: usuario.id } });
    choferes.push(chofer);
  }

  async function crearPacientesDeCentro(
    centro: typeof kineKids,
    tipo: "kine" | "pileta" | "geriatrico",
    cantidad: number,
    semilla: number,
  ) {
    const definiciones = generarPacientes(cantidad, tipo, semilla);
    const creados: {
      id: string;
      chofer: (typeof choferes)[number] | null;
      choferVuelta: (typeof choferes)[number] | null;
      horarios: { dia: DiaSemana; horaCita: string }[];
    }[] = [];

    for (let i = 0; i < definiciones.length; i++) {
      const d = definiciones[i];
      const chofer = d.conChofer ? choferes[(i + semilla) % choferes.length] : null;
      const choferVuelta = d.vueltaConChoferDistinto ? choferes[(i + semilla + 1) % choferes.length] : chofer;
      const paciente = await prisma.paciente.create({
        data: {
          nombre: d.nombre,
          direccion: d.direccion,
          telefono: d.telefono,
          centroId: centro.id,
          choferAsignadoId: chofer?.id ?? null,
          choferVueltaId: choferVuelta?.id ?? null,
          duracionEstimadaMin: d.duracionEstimadaMin,
          requiereSillaDeRuedas: d.requiereSillaDeRuedas,
          activo: d.activo,
          horarios: { create: d.horarios },
        },
      });
      creados.push({ id: paciente.id, chofer, choferVuelta, horarios: d.horarios });
    }
    return creados;
  }

  const kineKidsPacientes = await crearPacientesDeCentro(kineKids, "kine", 16, 0);
  const kineAdultsPacientes = await crearPacientesDeCentro(kineAdults, "kine", 16, 1);
  const piletaPacientes = await crearPacientesDeCentro(pileta, "pileta", 14, 2);
  const geriatricoPacientes = await crearPacientesDeCentro(geriatrico, "geriatrico", 16, 3);

  const hoy = toDateOnly(new Date());
  const diaDeHoy = DIA_POR_INDICE[hoy.getUTCDay()];
  const ESTADOS = [
    EstadoTraslado.PENDIENTE,
    EstadoTraslado.CONFIRMADO,
    EstadoTraslado.CANCELADO,
    EstadoTraslado.EXPIRADO,
  ];

  function codigo(i: number) {
    return `TRK_${10 + i}_${String.fromCharCode(65 + (i % 26))}`;
  }

  const grupos = [
    { pacientes: kineKidsPacientes, centro: kineKids },
    { pacientes: kineAdultsPacientes, centro: kineAdults },
    { pacientes: piletaPacientes, centro: pileta },
    { pacientes: geriatricoPacientes, centro: geriatrico },
  ];

  let idx = 0;
  for (const grupo of grupos) {
    // Solo pacientes que además de tener chofer, tienen turno hoy realmente (mismo criterio
    // que generarTrasladosDelDia) — si no, quedaba un traslado "de hoy" con el horario de otro día.
    const candidatos = grupo.pacientes
      .map((p) => ({ p, horario: p.horarios.find((h) => h.dia === diaDeHoy) }))
      .filter((x): x is { p: (typeof grupo.pacientes)[number]; horario: { dia: DiaSemana; horaCita: string } } =>
        Boolean(x.p.chofer && x.horario),
      );
    const muestra = candidatos.slice(0, 4);
    for (const { p, horario } of muestra) {
      if (!p.chofer) continue;
      await prisma.traslado.create({
        data: {
          codigo: codigo(idx),
          fecha: hoy,
          horaCita: horario.horaCita,
          choferId: p.chofer.id,
          choferRegresoId: p.choferVuelta?.id ?? p.chofer.id,
          estado: ESTADOS[idx % ESTADOS.length],
          pacienteId: p.id,
          centroDestinoId: grupo.centro.id,
        },
      });
      idx++;
    }
  }

  console.log("✅ Seed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
