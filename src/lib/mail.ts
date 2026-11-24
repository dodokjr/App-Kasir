import { HttpError } from "./api";

const URL = "https://api.emailjs.com/api/v1.0/email/send";

async function send(templateEnv: string, params: Record<string, string>) {
  const service = process.env.EMAILJS_SERVICE_ID;
  const pub = process.env.EMAILJS_PUBLIC_KEY;
  const template = process.env[templateEnv];
  if (!service || !pub || !template) throw new HttpError(500, "EmailJS belum dikonfigurasi (cek .env.local)");

  let r: Response;
  try {
    r = await fetch(URL, {
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
  } catch (e) {
    console.error("[emailjs] tidak bisa menghubungi EmailJS:", e);
    throw new HttpError(502, fail("Server tidak bisa menghubungi EmailJS (cek internet)"));
  }
  if (!r.ok) {
    const text = (await r.text().catch(() => "")).trim();
    console.error("[emailjs]", r.status, text);
    throw new HttpError(502, fail(hint(r.status, text) || `EmailJS membalas ${r.status}: ${text.slice(0, 160)}`));
  }
}

// Di produksi pengguna hanya melihat pesan umum. Saat development, penyebab sebenarnya ikut ditampilkan
const fail = (why: string) => (process.env.NODE_ENV === "production" ? "Gagal mengirim email. Coba lagi sebentar lagi" : `Gagal mengirim email: ${why}`);

function hint(status: number, t: string) {
  if (/non-browser/i.test(t)) return "Aktifkan 'Allow EmailJS API for non-browser applications' di EmailJS > Account > Security";
  if (/private key|access ?token/i.test(t)) return "EMAILJS_PRIVATE_KEY salah (salin ulang dari Account > General)";
  if (/public key|user_id/i.test(t)) return "EMAILJS_PUBLIC_KEY salah (salin ulang dari Account > General)";
  if (/template/i.test(t) && /not found|invalid|ID/i.test(t)) return "EMAILJS_TEMPLATE_OTP / _ALERT salah atau template tidak ada";
  if (/service/i.test(t) && /not found|invalid|ID/i.test(t)) return "EMAILJS_SERVICE_ID salah atau layanan email belum tersambung";
  if (/recipient|to_email|address is empty/i.test(t)) return "Kolom To Email di template harus diisi {{to_email}}";
  if (/gmail|invalid_grant|authenticat|insufficient/i.test(t)) return "Layanan email (mis. Gmail) perlu disambungkan ulang di EmailJS > Email Services";
  if (status === 429) return "Kuota atau batas kirim EmailJS tercapai, coba lagi nanti";
  return "";
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