import type { DiaSemana } from "../generated/prisma/client";

/** Venado Tuerto (Santa Fe) y localidades vecinas. */
export const LOCALIDADES = [
  "Venado Tuerto",
  "Maggiolo",
  "Cafferata",
  "Firmat",
  "Arias",
  "Chovet",
  "Elortondo",
  "Melincué",
  "Rufino",
  "Villa Cañás",
  "Murphy",
  "Sancti Spíritu",
  "Berabevú",
  "Chapuy",
  "Diego de Alvear",
  "Teodelina",
  "Christophersen",
  "Amenábar",
  "Carmen",
  "María Teresa",
  "Wheelwright",
  "Chañar Ladeado",
  "Los Quirquinchos",
  "Labordeboy",
  "Godeken",
  "Hughes",
];

const CALLES = [
  "San Martín",
  "Belgrano",
  "Sarmiento",
  "Mitre",
  "Rivadavia",
  "25 de Mayo",
  "9 de Julio",
  "Moreno",
  "Alberdi",
  "Independencia",
  "Córdoba",
  "Santa Fe",
  "Entre Ríos",
  "Corrientes",
  "San Lorenzo",
  "Pellegrini",
  "Urquiza",
  "Roca",
  "Chacabuco",
  "Maipú",
  "Libertad",
  "España",
  "Italia",
];

const NOMBRES_M = [
  "Juan", "Carlos", "Miguel", "José", "Luis", "Jorge", "Roberto", "Ricardo",
  "Eduardo", "Fernando", "Alberto", "Raúl", "Héctor", "Rubén", "Daniel",
  "Pablo", "Marcelo", "Gustavo", "Sergio", "Diego", "Francisco", "Rodrigo",
  "Martín", "Nicolás", "Federico", "Sebastián", "Ariel", "Hugo", "Osvaldo", "Ángel",
];

const NOMBRES_F = [
  "María", "Ana", "Rosa", "Marta", "Beatriz", "Claudia", "Silvia", "Patricia",
  "Susana", "Graciela", "Liliana", "Mónica", "Adriana", "Norma", "Alicia",
  "Cristina", "Laura", "Andrea", "Verónica", "Paula", "Carla", "Florencia",
  "Valentina", "Lucía", "Camila", "Sofía", "Estela", "Nélida", "Noemí", "Elsa",
];

const APELLIDOS = [
  "González", "Rodríguez", "Fernández", "López", "Martínez", "Pérez", "García",
  "Sánchez", "Romero", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores",
  "Acosta", "Benítez", "Medina", "Herrera", "Aguirre", "Ibáñez", "Sosa",
  "Molina", "Castro", "Ojeda", "Rojas", "Silva", "Domínguez", "Vega",
  "Peralta", "Cabrera", "Godoy", "Núñez", "Luna", "Correa", "Bravo",
  "Villalba", "Paredes", "Bianchi", "Ferreyra", "Bustos",
];

const DIAS_HABILES: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];

function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

export interface PacienteGenerado {
  nombre: string;
  direccion: string;
  telefono: string;
  requiereSillaDeRuedas: boolean;
  activo: boolean;
  conChofer: boolean;
  vueltaConChoferDistinto: boolean;
  duracionEstimadaMin: number;
  horarios: { dia: DiaSemana; horaCita: string }[];
}

/**
 * Genera pacientes de ejemplo de la zona de Venado Tuerto.
 * `semilla` desplaza los índices para que dos centros no generen los mismos nombres/direcciones.
 * `conChofer` en ~70% de los casos: el resto son pacientes con turno fijo pero sin chofer
 * asignado — tienen su horario pero no se les generan traslados automáticamente.
 */
export function generarPacientes(
  cantidad: number,
  tipo: "kine" | "pileta" | "geriatrico",
  semilla: number,
): PacienteGenerado[] {
  const pacientes: PacienteGenerado[] = [];
  const usados = new Set<string>();

  for (let n = 0; n < cantidad; n++) {
    const i = semilla * 97 + n;
    let intento = 0;
    let nombreCompleto = "";
    do {
      const esVaron = (i + intento) % 2 === 0;
      const nombre = esVaron ? pick(NOMBRES_M, i * 7 + intento * 13) : pick(NOMBRES_F, i * 7 + intento * 13);
      const apellido = pick(APELLIDOS, i * 11 + intento * 17 + 3);
      nombreCompleto = `${nombre} ${apellido}`;
      intento++;
    } while (usados.has(nombreCompleto) && intento < 50);
    usados.add(nombreCompleto);

    const calle = pick(CALLES, i * 5 + 2);
    const numeroCalle = 100 + ((i * 37) % 1900);
    const localidad = pick(LOCALIDADES, i * 3 + 1);
    const numeroTelefono = 500000 + ((i * 173) % 400000);
    const telefono = `+5493462${numeroTelefono}`;

    let dias: DiaSemana[];
    let horaBase: number;
    if (tipo === "pileta") {
      dias = n % 2 === 0 ? [pick(DIAS_HABILES, i)] : [pick(DIAS_HABILES, i), pick(DIAS_HABILES, i + 2)];
      horaBase = 9 + (n % 3);
    } else if (tipo === "geriatrico") {
      dias = [pick(DIAS_HABILES, i), pick(DIAS_HABILES, i + 2), pick(DIAS_HABILES, i + 4)];
      horaBase = 8 + (n % 3);
    } else {
      dias =
        n % 3 === 0
          ? [pick(DIAS_HABILES, i), pick(DIAS_HABILES, i + 2)]
          : [pick(DIAS_HABILES, i), pick(DIAS_HABILES, i + 2), pick(DIAS_HABILES, i + 4)];
      horaBase = 8 + (n % 5);
    }

    const diasUnicos = Array.from(new Set(dias));
    const minutos = (n % 4) * 15;
    const horarios = diasUnicos.map((dia) => ({
      dia,
      horaCita: `${String(horaBase).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`,
    }));

    const requiereSillaDeRuedas = tipo === "geriatrico" ? n % 2 === 0 : n % 6 === 0;
    const activo = n % 11 !== 0;
    const conChofer = n % 10 < 7;
    const vueltaConChoferDistinto = conChofer && n % 7 === 3;

    let duracionEstimadaMin: number;
    if (tipo === "pileta") {
      duracionEstimadaMin = n % 3 === 0 ? 45 : 30;
    } else if (tipo === "geriatrico") {
      duracionEstimadaMin = n % 3 === 0 ? 75 : 60;
    } else {
      duracionEstimadaMin = n % 4 === 0 ? 60 : n % 4 === 1 ? 30 : 45;
    }

    pacientes.push({
      nombre: nombreCompleto,
      direccion: `${calle} ${numeroCalle}, ${localidad}`,
      telefono,
      requiereSillaDeRuedas,
      activo,
      conChofer,
      vueltaConChoferDistinto,
      duracionEstimadaMin,
      horarios,
    });
  }

  return pacientes;
}
