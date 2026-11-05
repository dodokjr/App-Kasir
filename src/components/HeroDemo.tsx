"use client";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type Key = "fnb" | "retail" | "sembako";
const TABS: { key: Key; label: string; blurb: string }[] = [
  { key: "fnb", label: "Makanan dan minuman", blurb: "Catat nomor meja, nama pelanggan, dan nomor pesanan. Dapur mendapat struk sendiri tanpa harga." },
  { key: "retail", label: "Toko barang", blurb: "Jual per buah. Terima cash, transfer, QRIS, atau pesanan lewat kurir online." },
  { key: "sembako", label: "Sembako dan sayur", blurb: "Timbang mulai 0,1 kg. Harga dihitung per kg sampai rupiah terakhir." },
];

const Row = ({ a, b, bold }: { a: ReactNode; b: ReactNode; bold?: boolean }) => (
  <div className={`flex justify-between gap-3 ${bold ? "font-semibold" : ""}`}><span>{a}</span><span className="text-right">{b}</span></div>
);
const Dash = () => <hr className="my-2.5 border-dashed border-black/40" />;

// Kertas struk selalu putih dan hitam, sama seperti hasil cetak
function Paper({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div role="img" aria-label={label}
      className={`receipt-edge w-[230px] shrink-0 bg-white px-4 pt-4 font-mono text-[11.5px] leading-5 text-black shadow-[0_18px_34px_-14px_rgba(10,30,20,0.45)] sm:w-[250px] sm:text-xs ${className}`}>
      {children}
    </div>
  );
}

function Fnb() {
  return (
    <>
      <Paper label="Contoh struk customer untuk warung makan" className="-rotate-2">
        <div className="text-center"><div className="text-[13px] font-bold">Warung Bu Sari</div><div>Cabang Melati</div></div>
        <Dash />
        <Row a="Pesanan" b="#07" /><Row a="Meja" b="5" /><Row a="Customer" b="Budi" />
        <Dash />
        <div>Nasi goreng</div><Row a="2 x 25.000" b="50.000" />
        <div>Es teh manis</div><Row a="2 x 6.000" b="12.000" />
        <Dash />
        <Row a="Subtotal" b="62.000" /><Row a="PPN 12%" b="7.440" />
        <Row a="Total" b="Rp 69.440" bold /><Row a="Pembayaran" b="QRIS" />
        <div className="mt-2 text-center">Terima kasih</div>
      </Paper>
      <Paper label="Contoh struk dapur dengan nomor pesanan besar" className="mt-8 rotate-2 sm:-ml-10 sm:mt-14">
        <div className="text-center text-[13px] font-bold">STRUK DAPUR</div>
        <Dash />
        <div className="text-center text-3xl font-extrabold leading-9">#07</div>
        <Row a="Meja" b={<b className="text-sm">5</b>} /><Row a="Customer" b="Budi" />
        <Dash />
        <div className="text-[13px] font-bold">2x Nasi goreng</div><div className="pl-5 font-semibold">* pedas</div>
        <div className="mt-1.5 text-[13px] font-bold">2x Es teh manis</div><div className="pl-5 font-semibold">* kurang manis</div>
      </Paper>
    </>
  );
}
function Retail() {
  return (
    <Paper label="Contoh struk toko barang" className="-rotate-1">
      <div className="text-center"><div className="text-[13px] font-bold">Toko Maju Jaya</div><div>Cabang Anggrek</div></div>
      <Dash />
      <Row a="No" b="INV-0012" /><Row a="Kasir" b="Rina" />
      <Dash />
      <div>Kaos polos</div><Row a="2 x 65.000" b="130.000" />
      <div>Topi kanvas</div><Row a="1 x 45.000" b="45.000" />
      <Dash />
      <Row a="Total" b="Rp 175.000" bold /><Row a="Pembayaran" b="Transfer bank" /><Row a="Ref" b="TRF-88213" />
      <div className="mt-2 text-center">Terima kasih</div>
    </Paper>
  );
}
function Sembako() {
  return (
    <Paper label="Contoh struk toko sembako dengan jumlah per kilogram" className="rotate-1">
      <div className="text-center"><div className="text-[13px] font-bold">Sembako Barokah</div><div>Cabang Pasar Baru</div></div>
      <Dash />
      <Row a="No" b="INV-0031" /><Row a="Kasir" b="Dimas" />
      <Dash />
      <div>Beras premium</div><Row a="2,5 kg x 14.000" b="35.000" />
      <div>Tomat</div><Row a="0,3 kg x 12.000" b="3.600" />
      <div>Cabai rawit</div><Row a="0,2 kg x 80.000" b="16.000" />
      <Dash />
      <Row a="Total" b="Rp 54.600" bold /><Row a="Pembayaran" b="Cash" />
      <Row a="Bayar" b="60.000" /><Row a="Kembali" b="5.400" />
      <div className="mt-2 text-center">Terima kasih</div>
    </Paper>
  );
}

export default function HeroDemo() {
  const [tab, setTab] = useState<Key>("fnb");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cur = TABS.find((t) => t.key === tab)!;

  // Panah kiri/kanan berpindah tab, sesuai pola tab yang dikenal pembaca layar
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.key === tab);
    const n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].key;
    setTab(n); refs.current[n]?.focus(); e.preventDefault();
  };

  return (
    <div>
      <p className="mb-3 text-[15px] font-semibold">Pilih jenis usaha Anda, lihat struknya:</p>
      <div role="tablist" aria-label="Jenis usaha" onKeyDown={onKey} className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} ref={(el) => { refs.current[t.key] = el; }} role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls="demo-panel"
            tabIndex={tab === t.key ? 0 : -1} onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-2.5 text-[15px] font-semibold transition ${tab === t.key ? "border-accent bg-accent text-white" : "border-line bg-surface hover:border-accent"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div id="demo-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-4 overflow-hidden rounded-[2rem] bg-sun/25 px-4 pb-0 pt-8 sm:px-8">
        {/* key mengulang animasi cetak setiap kali jenis usaha diganti */}
        <div key={tab} className="print-in flex min-h-[420px] flex-col items-center justify-start gap-0 sm:flex-row sm:items-start sm:justify-center">
          {tab === "fnb" && <Fnb />}{tab === "retail" && <Retail />}{tab === "sembako" && <Sembako />}
        </div>
      </div>
      <p className="mt-4 max-w-[52ch] text-base leading-7 text-muted" aria-live="polite">{cur.blurb}</p>
    </div>
  );
}
