import { PALETTE_IDS } from "@/lib/theme";

// Dipasang di <head>: menerapkan mode gelap/terang DAN warna pilihan sebelum halaman digambar,
// jadi tidak ada kedip dan tidak kembali ke bawaan saat pindah halaman.
export const themeScript = `(function(){try{
var d=document.documentElement,L=localStorage;
var t=L.getItem("theme"),p=L.getItem("palette");
if(t!=="light"&&t!=="dark"&&t!=="system")t="system";
if(${JSON.stringify(PALETTE_IDS)}.indexOf(p)<0)p="daun";
var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);
d.classList.toggle("dark",dark);
d.style.colorScheme=dark?"dark":"light";
d.setAttribute("data-palette",p);
}catch(e){}})();`;