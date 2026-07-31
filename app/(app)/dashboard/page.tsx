"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import StatsCards from "@/components/Dashboard/StatsCards";
import TransferList from "@/components/Dashboard/TransferList";
import TransferDetail from "@/components/Dashboard/TransferDetail";
import PatientsPanel from "@/components/Dashboard/PatientsPanel";
import HistoryPanel from "@/components/Dashboard/HistoryPanel";
import WhatsAppModal from "@/components/modals/WhatsAppModal";
import TrasladoModal from "@/components/modals/TrasladoModal";
import Loader from "@/components/ui/Loader";
import { fetchTraslados, fetchPacientes, updateTraslado } from "@/lib/api-client";
import type { Paciente, Traslado } from "@/lib/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const esAdmin = session?.user?.rol === "ADMIN";

  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [editingTraslado, setEditingTraslado] = useState<Traslado | null>(null);

  useEffect(() => {
    Promise.all([fetchTraslados(), fetchPacientes()])
      .then(([t, p]) => {
        setTraslados(t);
        setPacientes(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const trasladosActualizados = useMemo(
    () =>
      traslados.map((t) => ({
        ...t,
        paciente: pacientes.find((p) => p.id === t.paciente.id) ?? t.paciente,
      })),
    [traslados, pacientes],
  );

  const stats = useMemo(() => {
    const activos = pacientes.filter((p) => p.activo);
    const porCentroMap = new Map<string, { nombre: string; cantidad: number }>();
    activos.forEach((p) => {
      const actual = porCentroMap.get(p.centro.id);
      porCentroMap.set(p.centro.id, { nombre: p.centro.nombre, cantidad: (actual?.cantidad ?? 0) + 1 });
    });

    return {
      confirmados: traslados.filter((t) => t.estado === "CONFIRMADO").length,
      pendientes: traslados.filter((t) => t.estado === "PENDIENTE").length,
      cancelados: traslados.filter((t) => t.estado === "CANCELADO").length,
      expirados: traslados.filter((t) => t.estado === "EXPIRADO").length,
      pacientesActivos: activos.length,
      pacientesPorCentro: esAdmin
        ? Array.from(porCentroMap, ([id, v]) => ({ id, ...v })).sort((a, b) => b.cantidad - a.cantidad)
        : [],
    };
  }, [traslados, pacientes, esAdmin]);

  const selectedTransfer = trasladosActualizados.find((t) => t.id === selectedTransferId) ?? null;

  function handleSaveTraslado(guardado: Traslado) {
    setTraslados((prev) => prev.map((t) => (t.id === guardado.id ? guardado : t)));
    setEditingTraslado(null);
  }

  async function handleToggleTramo(campo: "idaCancelada" | "vueltaCancelada") {
    if (!selectedTransfer) return;
    const actualizado = await updateTraslado(selectedTransfer.id, {
      [campo]: !selectedTransfer[campo],
    });
    setTraslados((prev) => prev.map((t) => (t.id === actualizado.id ? actualizado : t)));
  }

  if (loading) return <div className="page-loading"><Loader /></div>;
  if (error) return <div className="dashboard-page">Error: {error}</div>;

  return (
    <div className="dashboard-page">
      <StatsCards stats={stats} />

      <div className="dashboard-panels">
        <TransferList
          transfers={trasladosActualizados}
          selectedId={selectedTransferId}
          onSelect={setSelectedTransferId}
        />
        <TransferDetail
          transfer={selectedTransfer}
          onWhatsappClick={() => setWhatsappOpen(true)}
          onModificarClick={() => setEditingTraslado(selectedTransfer)}
          onToggleIda={() => handleToggleTramo("idaCancelada")}
          onToggleVuelta={() => handleToggleTramo("vueltaCancelada")}
        />
      </div>

      <div className="dashboard-bottom">
        <PatientsPanel />
        <HistoryPanel />
      </div>

      {whatsappOpen && selectedTransfer && (
        <WhatsAppModal
          context={{
            nombre: selectedTransfer.paciente.nombre,
            telefono: selectedTransfer.paciente.telefono,
            hora: selectedTransfer.horaCita,
            centro: selectedTransfer.centroDestino.nombre,
          }}
          onClose={() => setWhatsappOpen(false)}
        />
      )}

      {editingTraslado && (
        <TrasladoModal
          traslado={editingTraslado}
          pacientes={pacientes}
          onClose={() => setEditingTraslado(null)}
          onSave={handleSaveTraslado}
        />
      )}
    </div>
  );
}
