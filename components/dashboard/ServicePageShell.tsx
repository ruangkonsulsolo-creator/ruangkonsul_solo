import type { LucideIcon } from "lucide-react";
import { Clock, FileCheck2, ShieldCheck } from "lucide-react";

interface ServicePageShellProps {
  icon: LucideIcon;
  name: string;
  description: string;
  slaHours: number;
  formats: string;
  maxSizeMb: number;
  colorClass: string;      // e.g. "bg-brand-50 text-brand"
  notice?: React.ReactNode;
  children: React.ReactNode;
}

export function ServicePageShell({
  icon: Icon,
  name,
  description,
  slaHours,
  formats,
  maxSizeMb,
  colorClass,
  notice,
  children,
}: ServicePageShellProps) {
  return (
    <div className="max-w-2xl space-y-7">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ${colorClass}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">{name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Info strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock,      text: `~${slaHours} jam`,  label: "Estimasi" },
          { icon: FileCheck2, text: formats,              label: "Format" },
          { icon: ShieldCheck,text: `Maks. ${maxSizeMb} MB`, label: "Ukuran" },
        ].map((s) => {
          const SIcon = s.icon;
          return (
            <div key={s.label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center shadow-card">
              <SIcon className="h-4 w-4 text-brand" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-800">{s.text}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Optional notice */}
      {notice}

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Form slot */}
      {children}
    </div>
  );
}
