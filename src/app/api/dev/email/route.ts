import { handle, need, HttpError } from "@/lib/api";
import { all } from "@/lib/sheets";
import { sendDevEmail, devMailReady } from "@/lib/mail";

const MAX_TO = 20;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

// Kirim email ke pengguna lewat EmailJS khusus developer. Penerima dipilih dari ID akun terdaftar (bukan alamat bebas),
// jadi endpoint ini tidak bisa dipakai mengirim email ke sembarang orang.
export const POST = handle(async (req) => {
  await need(["developer"]);
  if (!devMailReady()) throw new HttpError(500, "EmailJS khusus developer belum dikonfigurasi (isi EMAILJS_DEV_TEMPLATE dan kunci EmailJS di .env.local)");
  const b = await req.json();
  const subject = clean(b.subject, 150);
  const message = clean(b.message, 5000);
  const ids: string[] = Array.isArray(b.ids) ? [...new Set<string>(b.ids.map(String))] : [];
  if (!subject || !message) throw new HttpError(400, "Subjek dan isi pesan wajib diisi");
  if (!ids.length) throw new HttpError(400, "Pilih minimal satu penerima");
  if (ids.length > MAX_TO) throw new HttpError(400, `Maksimal ${MAX_TO} penerima sekali kirim (kuota EmailJS terbatas)`);

  const users = await all("users");
  const results: { id: string; email: string; ok: boolean; error?: string }[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const u = users.find((x) => x.id === id);
    if (!u || !/^\S+@\S+\.\S+$/.test(u.email) || seen.has(u.email.toLowerCase())) {
      results.push({ id, email: u?.email ?? "", ok: false, error: u ? "Email tidak valid atau dobel" : "Pengguna tidak ditemukan" });
      continue;
    }
    seen.add(u.email.toLowerCase());
    try { await sendDevEmail(u.email, u.name, subject, message); results.push({ id, email: u.email, ok: true }); }
    catch (e) { results.push({ id, email: u.email, ok: false, error: (e as Error).message }); }
  }
  return { sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
});
