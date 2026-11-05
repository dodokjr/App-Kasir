import { handle } from "@/lib/api";
import { getSession, destroySession } from "@/lib/auth";
import { leave } from "@/lib/presence";

export const POST = handle(async () => {
  const s = await getSession();
  if (s) await leave(s.uid).catch(() => {});
  await destroySession();
  return { ok: true };
});