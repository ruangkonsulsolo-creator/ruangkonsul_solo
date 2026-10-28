import { TrendingUp, ShoppingCart, Users, CalendarDays } from "lucide-react";

interface Props {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalBookings: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export function SuperadminStats({ totalRevenue, totalOrders, totalUsers, totalBookings }: Props) {
  const stats = [
    { icon: TrendingUp,   label: "Total Revenue",    value: fmt(totalRevenue), color: "bg-[#8B0000] text-white" },
    { icon: ShoppingCart, label: "Total Pesanan",     value: totalOrders.toLocaleString("id-ID"),   color: "bg-brand-50 text-[#8B0000]" },
    { icon: Users,        label: "Total Customer",    value: totalUsers.toLocaleString("id-ID"),    color: "bg-brand-50 text-[#8B0000]" },
    { icon: CalendarDays, label: "Total Booking",     value: totalBookings.toLocaleString("id-ID"), color: "bg-brand-50 text-[#8B0000]" },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${s.color}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}
