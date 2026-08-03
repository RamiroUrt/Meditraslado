"use client";

import { useEffect, useState } from "react";

const PHOTO_CHANGE_EVENT = "meditraslado-photo-change";

export function notificarCambioFoto() {
  window.dispatchEvent(new Event(PHOTO_CHANGE_EVENT));
}

export function useFotoPerfil(): string | null {
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    function cargar() {
      fetch("/api/account/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setFoto(data?.fotoUrl ?? null))
        .catch(() => {});
    }
    cargar();
    window.addEventListener(PHOTO_CHANGE_EVENT, cargar);
    return () => window.removeEventListener(PHOTO_CHANGE_EVENT, cargar);
  }, []);

  return foto;
}
