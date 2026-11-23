import { HttpError } from "@/lib/api";
import type { Session } from "@/lib/auth";
import { all } from "@/lib/sheets";

// Kepala toko boleh memilih cabang di tokonya. Peran lain selalu cabangnya sendiri
export async function branchFor(s: Session, requested?: string | null) {
  if (s.role !== "kepala_toko") return s.branchId;
  const id = requested || s.branchId;
  const ok = (await all("branches")).some((x) => x.id === id && x.storeId === s.storeId);
  if (!ok) throw new HttpError(400, "Cabang tidak valid");
  return id;
}
