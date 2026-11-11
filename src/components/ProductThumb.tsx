"use client";
import { useState } from "react";

// Foto produk, atau kotak berinisial bila belum ada foto atau foto gagal dimuat.
// `square` = mengisi lebar penuh dengan rasio 1:1 (kartu kasir). Selain itu ukuran tetap `size` px.
export default function ProductThumb({ id, ver, name, size = 44, square = false }: { id: string; ver?: string; name: string; size?: number; square?: boolean }) {
  const [badVer, setBadVer] = useState("");
  const has = !!ver && badVer !== ver;
  const dim = square ? { aspectRatio: "1 / 1", width: "100%" } : { width: size, height: size };
  if (has) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/product-images?id=${id}&v=${ver}`} alt="" loading="lazy" decoding="async" onError={() => setBadVer(ver!)}
      style={dim} className="flex-none rounded-lg bg-paper object-cover" />;
  }
  return (
    <span aria-hidden="true" style={dim} className={`flex flex-none items-center justify-center rounded-lg bg-accent/10 font-extrabold text-accent dark:text-link ${square ? "text-4xl" : "text-base"}`}>
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}