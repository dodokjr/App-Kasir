import { HttpError } from "./api";

const URL = "https://api.emailjs.com/api/v1.0/email/send";

async function send(templateEnv: string, params: Record<string, string>) {
  const service = process.env.EMAILJS_SERVICE_ID;
  const pub = process.env.EMAILJS_PUBLIC_KEY;
  const template = process.env[templateEnv];
  if (!service || !pub || !template) throw new HttpError(500, "EmailJS belum dikonfigurasi (cek .env.local)");

  const r = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: service,
      template_id: template,
      user_id: pub,
      accessToken: process.env.EMAILJS_PRIVATE_KEY || undefined,
      template_params: params,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) {
    console.error("[emailjs]", r.status, await r.text().catch(() => ""));
    throw new HttpError(502, "Gagal mengirim email. Coba lagi sebentar lagi");
  }
}

/** Template OTP memakai: {{to_email}}, {{to_name}}, {{passcode}}, {{time}} (jam kedaluwarsa, WIB), {{expires_min}}, {{app_name}} */
export const sendOtpEmail = (to: string, name: string, code: string) =>
  send("EMAILJS_TEMPLATE_OTP", {
    to_email: to, to_name: name, passcode: code, otp_code: code, expires_min: "10", app_name: "Galaxy Kasir",
    time: new Date(Date.now() + 10 * 60_000).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) + " WIB",
  });

/** Template peringatan memakai: {{to_email}}, {{to_name}}, {{ip_address}}, {{location}}, {{time}}, {{device}}, {{app_name}} */
export const sendAlertEmail = (to: string, name: string, p: { ip: string; location: string; device: string }) =>
  send("EMAILJS_TEMPLATE_ALERT", {
    to_email: to, to_name: name, ip_address: p.ip, location: p.location, device: p.device, app_name: "Galaxy Kasir",
    time: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "long" }),
  });
