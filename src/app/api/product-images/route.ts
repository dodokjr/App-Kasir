import { handle, need, inScope, HttpError } from "@/lib/api";
import { all, add, update, now } from "@/lib/sheets";
import { IMAGE_HARD_MAX_CHARS } from "@/lib/image";

const WRITERS = ["gudang", "kepala_toko", "kepala_cabang"] as const;
const URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

// Cek isi file yang sebenarnya, bukan hanya label tipenya (mencegah file lain disamarkan sebagai gambar)
function realType(b: Buffer) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 4 && b[0] === 0x89 && b.subarray(1, 4).toString() === "PNG") return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return "";
}

async function productOf(s: Awaited<ReturnType<typeof need>>, id: unknown) {
  const p = (await all("products")).find((x) => x.id === id);
  if (!p || !inScope(s, p)) throw new HttpError(404, "Produk tidak ditemukan");
  return p;
}

// Menampilkan foto. URL memuat versi (?v=), jadi browser boleh menyimpannya lama
export const GET = handle(async (req) => {
  const s = await need();
  const id = new URL(req.url).searchParams.get("id");
  const p = await productOf(s, id);
  const img = (await all("product_images")).find((x) => x.id === p.id);
  if (!img || !img.data) throw new HttpError(404, "Produk ini belum punya foto");
  return new Response(new Uint8Array(Buffer.from(img.data, "base64")), {
    headers: {
      "Content-Type": img.mime || "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const POST = handle(async (req) => {
  const s = await need([...WRITERS]);
  const b = await req.json();
  const p = await productOf(s, b.productId);
  const m = typeof b.dataUrl === "string" && b.dataUrl.length <= IMAGE_HARD_MAX_CHARS ? URL_RE.exec(b.dataUrl) : null;
  if (!m) throw new HttpError(400, "Foto tidak valid atau terlalu besar");
  const bytes = Buffer.from(m[2], "base64");
  const type = realType(bytes);
  if (!type || type !== m[1]) throw new HttpError(400, "Isi file bukan foto JPG, PNG, atau WebP yang valid");

  const row = { id: p.id, storeId: p.storeId, branchId: p.branchId, mime: type, data: m[2], updatedAt: now() };
  try { await update("product_images", p.id, row); } catch { await add("product_images", row); }
  const imageVer = String(Date.now());
  await update("products", p.id, { imageVer });
  return { ok: true, imageVer };
});

// Foto dihapus (dikosongkan), produknya tetap ada
export const DELETE = handle(async (req) => {
  const s = await need([...WRITERS]);
  const b = await req.json();
  const p = await productOf(s, b.productId);
  try { await update("product_images", p.id, { data: "", updatedAt: now() }); } catch { /* belum pernah ada foto */ }
  await update("products", p.id, { imageVer: "" });
  return { ok: true };
});