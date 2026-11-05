import { handle, need } from "@/lib/api";
import { all } from "@/lib/sheets";
import { normBusiness } from "@/lib/business";

export const GET = handle(async () => {
  const s = await need();
  const store = s.storeId ? (await all("stores")).find((x) => x.id === s.storeId) : null;
  const branch = s.branchId ? (await all("branches")).find((x) => x.id === s.branchId) : null;
  return {
    session: s,
    store: store ? { name: store.name, businessType: normBusiness(store.businessType) } : null,
    branch: branch ? { name: branch.name, street: branch.street } : null,
  };
});