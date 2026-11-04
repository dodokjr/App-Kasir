"use client";

type Props = {
  branches: Record<string, string>[];
  value: string;
  onChange: (id: string) => void;
  allowAll?: boolean;
};

// Pemilih cabang yang dipakai di Dashboard, Kasir, dan Gudang
export default function BranchSelect({ branches, value, onChange, allowAll }: Props) {
  return (
    <div>
      <label className="label" htmlFor="branch-filter">Cabang</label>
      <select id="branch-filter" className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {allowAll && <option value="">Semua cabang</option>}
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.street}</option>)}
      </select>
    </div>
  );
}
