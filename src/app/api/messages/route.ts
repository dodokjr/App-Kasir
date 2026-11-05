import { handle, need, HttpError } from "@/lib/api";
import { all, update, now } from "@/lib/sheets";

const PLATFORM = ["developer", "admin"] as const;

// Pesan dari halaman Kontak. Hanya developer dan admin yang boleh membaca
export const GET = handle(async () => {
  await need([...PLATFORM]);
  const rows = (await all("messages")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { unread: rows.filter((m) => !m.readAt).length, rows };
});

// Tandai sudah dibaca / belum dibaca
export const PATCH = handle(async (req) => {
  const s = await need([...PLATFORM]);
  const b = await req.json();
  const m = (await all("messages")).find((x) => x.id === b.id);
  if (!m) throw new HttpError(404, "Pesan tidak ditemukan");
  await update("messages", m.id, b.read ? { readAt: now(), readBy: s.name } : { readAt: "", readBy: "" });
  return { ok: true };
});