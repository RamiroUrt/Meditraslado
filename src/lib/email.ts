import { Resend } from "resend";

export async function enviarEmailResetPassword(destinatario: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY en .env");
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "MediTraslado <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: destinatario,
    subject: "Restablecer tu contraseña — MediTraslado",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563eb;">MediTraslado</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Restablecer contraseña
          </a>
        </p>
        <p>Este link expira en 1 hora. Si no pediste este cambio, ignorá este correo.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message ?? "Error al enviar el email de reseteo");
  }
}
