export default function DashboardLoading() {
  return (
    <div className="space-y-7 max-w-5xl animate-pulse">
      {/* Greeting skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-xl bg-slate-200" />
          <div className="h-4 w-64 rounded-lg bg-slate-100" />
        </div>
        <div className="h-10 w-36 rounded-2xl bg-slate-100" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="h-11 w-11 rounded-xl bg-slate-100 mb-4" />
            <div className="h-4 w-28 rounded bg-slate-100 mb-2" />
            <div className="h-3 w-20 rounded bg-slate-100 mb-3" />
            <div className="h-5 w-24 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-20 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
