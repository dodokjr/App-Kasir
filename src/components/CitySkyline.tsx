/* ---------- Gedung kota di belakang deretan toko ----------
   Dua lapis siluet: gedung jauh (pucat, tanpa jendela) dan gedung dekat (menara bertingkat,
   atap miring, kubah, antena). Warna ikut jam: biru-abu saat siang, ungu saat sore, navy saat malam.
   Jendela menyala satu per satu saat sore sampai malam, dan lampu merah di antena berkedip.
   Dipakai di SkyLayers (PageParts), jadi hero dan panel struk sama-sama punya latar kota. */

   const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
   const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
   
   function mulberry32(a: number) {
     return () => {
       a |= 0; a = (a + 0x6d2b79f5) | 0;
       let t = Math.imul(a ^ (a >>> 15), 1 | a);
       t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
       return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
     };
   }
   
   const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
   const mix = (a: string, b: string, t: number) => {
     const A = rgb(a), B = rgb(b);
     return "#" + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, "0")).join("");
   };
   // Siang -> malam, lalu semburat ungu saat sore
   const tone = (d: string, k: string, n: string, night: number, dusk: number) =>
     mix(mix(d, n, night), k, dusk * 0.6);
   
   const GROUND = 300;
   
   type Kind = "flat" | "spire" | "step" | "slant" | "dome";
   type Tower = { x: number; w: number; h: number; kind: Kind; ant?: boolean };
   
   // Gedung dekat: menara bertingkat dengan bentuk atap berbeda-beda
   const NEAR: Tower[] = [
     { x: 30, w: 90, h: 210, kind: "flat" },
     { x: 140, w: 70, h: 250, kind: "spire" },
     { x: 235, w: 110, h: 190, kind: "step" },
     { x: 370, w: 80, h: 235, kind: "slant" },
     { x: 470, w: 120, h: 270, kind: "step", ant: true },
     { x: 615, w: 75, h: 200, kind: "dome" },
     { x: 715, w: 95, h: 225, kind: "flat" },
     { x: 835, w: 70, h: 260, kind: "spire" },
     { x: 930, w: 110, h: 195, kind: "step" },
     { x: 1065, w: 100, h: 235, kind: "slant" },
   ];
   
   // Gedung jauh: x, lebar, tinggi
   const FAR: [number, number, number][] = [
     [0, 70, 120], [60, 60, 150], [125, 80, 110], [210, 55, 170], [270, 70, 130], [345, 90, 100],
     [440, 60, 160], [505, 75, 125], [585, 65, 175], [655, 80, 115], [740, 55, 150], [800, 85, 130],
     [890, 60, 165], [955, 70, 110], [1030, 80, 145], [1115, 85, 125],
   ];
   
   // Puncak struktur (untuk antena dan lampu), dan tinggi mahkota per jenis
   const crownTop = (t: Tower) => {
     const top = GROUND - t.h;
     if (t.kind === "spire") return top - 24;
     if (t.kind === "step") return top - 36;
     return top;
   };
   
   // Posisi jendela dibuat sekali. r menentukan kapan jendela itu menyala:
   // makin malam, makin banyak jendela yang nilai r-nya di bawah ambang.
   const WINDOWS = (() => {
     const rnd = mulberry32(21);
     const out: { x: number; y: number; r: number }[] = [];
     const bottom = GROUND - 110; // bagian bawah tertutup deretan toko
     const grid = (x0: number, x1: number, y0: number, y1: number) => {
       for (let y = y0; y <= y1; y += 16) for (let x = x0; x + 6 <= x1; x += 14) out.push({ x, y, r: rnd() });
     };
     NEAR.forEach((t) => {
       const top = GROUND - t.h;
       const x0 = t.x + 8, x1 = t.x + t.w - 8;
       if (t.kind === "step") {
         const uw = t.w * 0.6;
         grid(x0, x1, top + 12, bottom);
         grid(t.x + (t.w - uw) / 2 + 6, t.x + (t.w + uw) / 2 - 6, top - 36 + 10, top - 8);
       } else if (t.kind === "spire") {
         grid(x0, x1, top + 12, bottom);
         grid(t.x + t.w * 0.25 + 6, t.x + t.w * 0.75 - 6, top - 24 + 8, top - 6);
       } else if (t.kind === "slant") grid(x0, x1, top + 36, bottom);
       else if (t.kind === "dome") grid(x0, x1, top + t.w / 2 + 10, bottom);
       else grid(x0, x1, top + 14, bottom);
     });
     return out;
   })();
   
   function Body({ t, fill }: { t: Tower; fill: string }) {
     const top = GROUND - t.h;
     const cx = t.x + t.w / 2;
     switch (t.kind) {
       case "spire":
         return (
           <>
             <rect x={t.x} y={top} width={t.w} height={t.h} fill={fill} />
             <rect x={t.x + t.w * 0.25} y={top - 24} width={t.w * 0.5} height={26} fill={fill} />
             <rect x={cx - 1} y={top - 54} width={2} height={32} fill={fill} />
           </>
         );
       case "step": {
         const uw = t.w * 0.6;
         return (
           <>
             <rect x={t.x} y={top} width={t.w} height={t.h} fill={fill} />
             <rect x={cx - uw / 2} y={top - 36} width={uw} height={38} fill={fill} />
             {t.ant && <rect x={cx - 1} y={top - 70} width={2} height={36} fill={fill} />}
           </>
         );
       }
       case "slant":
         return <polygon points={`${t.x},${top + 30} ${t.x + t.w},${top} ${t.x + t.w},${GROUND} ${t.x},${GROUND}`} fill={fill} />;
       case "dome":
         return (
           <>
             <rect x={t.x} y={top + t.w / 2} width={t.w} height={t.h - t.w / 2} fill={fill} />
             <path d={`M${t.x} ${top + t.w / 2}a${t.w / 2} ${t.w / 2} 0 0 1 ${t.w} 0z`} fill={fill} />
           </>
         );
       default:
         return (
           <>
             <rect x={t.x} y={top} width={t.w} height={t.h} fill={fill} />
             <rect x={cx - t.w * 0.15} y={top - 8} width={t.w * 0.3} height={10} fill={fill} />
           </>
         );
     }
   }
   
   export default function CitySkyline({
     day,
     dusk,
     night,
     strong = false,
   }: {
     day: number;
     dusk: number;
     night: number;
     strong?: boolean;
   }) {
     const lit = clamp(night + dusk * 0.6);
     const far = tone("#b6c3d4", "#9a8fb5", "#26304f", night, dusk);
     const near = tone("#8b9bb0", "#6b5d8a", "#141a33", night, dusk);
     const glass = mix("#dbeafe", "#0b1226", night);
   
     const on = WINDOWS.filter((w) => w.r < lit);
     const off = WINDOWS.filter((w) => w.r >= lit);
     const glow = `drop-shadow(0 0 5px rgba(253,224,138,${(lit * 0.8).toFixed(2)}))`;
     const beacons = NEAR.filter((t) => t.kind === "spire" || t.ant);
   
     return (
       <svg
         viewBox={`0 0 1200 ${GROUND}`}
         preserveAspectRatio="xMidYMax slice"
         className={`absolute inset-x-0 bottom-0 w-full ${strong ? "h-60 sm:h-80" : "h-56 opacity-40 sm:h-72"}`}
         aria-hidden="true"
       >
         {/* Gedung jauh */}
         <g fill={far} opacity={0.6}>
           {FAR.map(([x, w, h]) => (
             <rect key={x} x={x} y={GROUND - h} width={w} height={h} />
           ))}
         </g>
   
         {/* Gedung dekat */}
         {NEAR.map((t) => (
           <Body key={t.x} t={t} fill={near} />
         ))}
   
         {/* Jendela: yang belum menyala memantulkan langit, yang menyala berpendar kuning */}
         <g fill={glass} fillOpacity={0.12 + day * 0.2 + dusk * 0.1}>
           {off.map((w, i) => (
             <rect key={i} x={w.x} y={w.y} width={6} height={8} rx={1} />
           ))}
         </g>
         <g fill="#fde68a" fillOpacity={0.9} style={{ filter: glow }}>
           {on.map((w, i) => (
             <rect key={i} x={w.x} y={w.y} width={6} height={8} rx={1} />
           ))}
         </g>
   
         {/* Lampu merah di ujung antena, berkedip saat malam */}
         <g style={{ opacity: clamp(night * 1.2) }}>
           {beacons.map((t) => (
             <circle
               key={t.x}
               cx={t.x + t.w / 2}
               cy={crownTop(t) - (t.kind === "spire" ? 32 : 34)}
               r={3}
               fill="#ef4444"
               className="animate-pulse motion-reduce:animate-none"
             />
           ))}
         </g>
       </svg>
     );
   }