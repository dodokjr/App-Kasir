// Pemeriksaan koneksi ringan: tidak membaca data apa pun dan tidak memakai kuota Google Sheets
export const GET = () => Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
