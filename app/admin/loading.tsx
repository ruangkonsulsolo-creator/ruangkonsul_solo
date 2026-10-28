export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 h-24" />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white h-64" />
    </div>
  );
}
