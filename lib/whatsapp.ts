const GRAPH_API_VERSION = "v25.0";

function telefonoSinMas(telefono: string) {
  return telefono.replace(/^\+/, "");
}

async function llamarGraphApi(body: Record<string, unknown>) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("Faltan las credenciales de WhatsApp (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN) en .env");
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const mensaje = data?.error?.message ?? `Error ${res.status} al llamar a la API de WhatsApp`;
    throw new Error(mensaje);
  }
  return data;
}

/**
 * Envía una plantilla pre-aprobada por Meta. Necesario para cualquier mensaje que
 * inicia la conversación (el paciente no le escribió antes, o pasaron más de 24hs).
 * `variables` son los valores de las variables numeradas ({{1}}, {{2}}, ...) en el
 * orden en que aparecen en el cuerpo de la plantilla aprobada.
 */
export async function enviarPlantilla(
  telefono: string,
  nombrePlantilla: string,
  variables: string[] = [],
  idioma = "es_AR",
) {
  return llamarGraphApi({
    messaging_product: "whatsapp",
    to: telefonoSinMas(telefono),
    type: "template",
    template: {
      name: nombrePlantilla,
      language: { code: idioma },
      ...(variables.length > 0
        ? {
            components: [
              {
                type: "body",
                parameters: variables.map((texto) => ({ type: "text", text: texto })),
              },
            ],
          }
        : {}),
    },
  });
}

/**
 * Envía texto libre. Solo válido dentro de las 24hs posteriores al último mensaje
 * del paciente (ventana de servicio al cliente) — Meta rechaza esto fuera de esa ventana.
 */
export async function enviarTexto(telefono: string, mensaje: string) {
  return llamarGraphApi({
    messaging_product: "whatsapp",
    to: telefonoSinMas(telefono),
    type: "text",
    text: { body: mensaje },
  });
}
