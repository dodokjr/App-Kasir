import { handle, need, HttpError } from "@/lib/api";
import { all, add, update, uid, now } from "@/lib/sheets";

const bool = (v: string | undefined, d: boolean) => (v === undefined || v === "" ? d : v === "TRUE");
const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

export const GET = handle(async () => {
  const s = await need();
  const store = (await all("stores")).find((x) => x.id === s.storeId);
  const r = (await all("receipt_settings")).find((x) => x.storeId === s.storeId);
  return {
    storeName: r?.storeName || store?.name || "",
    address: r?.address ?? "",
    phone: r?.phone ?? "",
    header: r?.header ?? "",
    footer: r ? r.footer : "Terima kasih atas kunjungan Anda",
    paper: r?.paper === "58" ? "58" : "80",
    showInvoice: bool(r?.showInvoice, true),
    showCashier: bool(r?.showCashier, true),
    showPayment: bool(r?.showPayment, true),
    autoPrint: bool(r?.autoPrint, false),
  };
});

export const POST = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const b = await req.json();
  const row = {
    storeId: s.storeId,
    storeName: clip(b.storeName, 60), address: clip(b.address, 160), phone: clip(b.phone, 30),
    header: clip(b.header, 160), footer: clip(b.footer, 160),
    paper: b.paper === "58" ? "58" : "80",
    showInvoice: b.showInvoice ? "TRUE" : "FALSE", showCashier: b.showCashier ? "TRUE" : "FALSE",
    showPayment: b.showPayment ? "TRUE" : "FALSE", autoPrint: b.autoPrint ? "TRUE" : "FALSE",
    updatedAt: now(),
  };
  if (!row.storeName.trim()) throw new HttpError(400, "Nama toko di struk wajib diisi");
  const cur = (await all("receipt_settings")).find((x) => x.storeId === s.storeId);
  if (cur) await update("receipt_settings", cur.id, row);
  else await add("receipt_settings", { id: uid(), ...row });
  return { ok: true };
});
