// Pencarian produk: huruf besar/kecil dan aksen diabaikan, dan semua kata harus cocok
// (mis. "beras pre" menemukan "Beras Premium 5kg")
export const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function matches(q: string, ...fields: (string | undefined)[]) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = norm(fields.filter(Boolean).join(" "));
  return words.every((w) => hay.includes(w));
}