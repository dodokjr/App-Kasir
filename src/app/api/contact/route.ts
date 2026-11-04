import { handle, HttpError } from "@/lib/api";
import { add, uid, now } from "@/lib/sheets";

// Pembatas sederhana: 5 pesan per jam per IP (disimpan di memori server)
const hits = new Map<string, number[]>();

export const POST = handle(async (req) => {
  const b = await req.json();
  if (b.website) return { ok: true }; // bot mengisi kolom jebakan, abaikan diam-diam

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const recent = (hits.get(ip) ?? []).filter((t) => Date.now() - t < 3600_000);
  if (recent.length >= 5) throw new HttpError(429, "Terlalu banyak pesan. Coba lagi satu jam lagi");
  hits.set(ip, [...recent, Date.now()]);

  const name = String(b.name || "").trim().slice(0, 100);
  const email = String(b.email || "").trim().slice(0, 150);
  const subject = String(b.subject || "").trim().slice(0, 150);
  const message = String(b.message || "").trim().slice(0, 2000);
  if (!name || !subject || !message || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Lengkapi semua kolom dengan benar");

  // Awali tanda yang dianggap formula oleh spreadsheet agar tidak dieksekusi
  const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
  await add("messages", { id: uid(), name: safe(name), email, subject: safe(subject), message: safe(message), createdAt: now() });
  return { ok: true };
});
