import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";

/** Tautan ke halaman masuk, daftar, atau lupa password. Bila pengunjung sudah masuk, tautan berubah ke dashboard */
export default async function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  const s = await getSession().catch(() => null);
  return s ? <Link href="/dashboard">dashboard</Link> : <Link href={href}>{children}</Link>;
}