import { handle, need, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";

export const GET = handle(async () => {
  await need(["developer", "admin"]);
  const [stores, branches, users] = await Promise.all([all("stores"), all("branches"), all("users")]);
  return stores.map((s) => ({
    ...s,
    branches: branches.filter((b) => b.storeId === s.id).length,
    users: users.filter((u) => u.storeId === s.id).length,
  }));
});

export const PATCH = handle(async (req) => {
  await need(["developer", "admin"]);
  const b = await req.json();
  if (!b.id) throw new HttpError(400, "ID toko wajib");
  await update("stores", b.id, { active: b.active ? "TRUE" : "FALSE" });
  return { ok: true };
});
