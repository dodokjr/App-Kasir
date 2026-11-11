// Foto produk dikecilkan di browser menjadi thumbnail JPEG persegi, lalu disimpan di Google Sheets.
// Satu sel Sheets maksimal 50.000 karakter, jadi hasilnya dijaga di bawah IMAGE_MAX_CHARS.
export const IMAGE_MAX_CHARS = 40_000;
export const IMAGE_HARD_MAX_CHARS = 45_000; // batas di server
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  if (typeof createImageBitmap === "function") {
    try { const b = await createImageBitmap(file); return { src: b, w: b.width, h: b.height, done: () => b.close() }; } catch { /* coba cara lain */ }
  }
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Foto tidak bisa dibaca. Pakai foto berformat JPG atau PNG")); };
    img.src = url;
  });
}

/** Mengembalikan data URL JPEG persegi (potong tengah). Melempar Error berbahasa Indonesia jika gagal. */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa foto (JPG, PNG, atau WebP)");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Foto terlalu besar. Maksimal 12 MB");
  const { src, w, h, done } = await decode(file);
  try {
    const crop = Math.min(w, h), sx = (w - crop) / 2, sy = (h - crop) / 2;
    for (const side of [240, 180, 128]) {
      const c = document.createElement("canvas");
      c.width = c.height = side;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Browser ini tidak mendukung pengolahan foto");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, side, side); // PNG transparan jadi putih, bukan hitam
      ctx.drawImage(src, sx, sy, crop, crop, 0, 0, side, side);
      for (const q of [0.82, 0.72, 0.62, 0.5, 0.4]) {
        const url = c.toDataURL("image/jpeg", q);
        if (url.length <= IMAGE_MAX_CHARS) return url;
      }
    }
    throw new Error("Foto terlalu rumit untuk dikecilkan. Coba foto lain");
  } finally { done(); }
}