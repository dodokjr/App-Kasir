import { handle } from "@/lib/api";
import { getSession, destroySession } from "@/lib/auth";
import { all, update } from "@/lib/sheets";
import { leave } from "@/lib/presence";

export const POST = handle(async () => {
  const s = await getSession({ check: false });
  if (s) {
    await leave(s.uid).catch(() => {});
    // Lepas kunci perangkat, tetapi hanya bila sesi ini memang sesi aktif milik akun (bukan sesi lama yang sudah digantikan)
    if (s.sid) {
      try {
        const u = (await all("users", { fresh: true })).find((x) => x.id === s.uid);
        if (u && u.sessionId === s.sid) await update("users", u.id, { sessionId: "", sessionExp: "" });
      } catch (e) { console.error("[logout]", e); }
    }
  }
  await destroySession();
  return { ok: true };
});
