export default function DashboardLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat dasbor"
      className="animate-pulse space-y-5"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="h-2.5 w-24 rounded-full bg-surface-2" />
          <div className="mt-3 h-7 w-64 rounded-[7px] bg-surface-2" />
          <div className="mt-3 h-3 w-[340px] max-w-full rounded-full bg-surface-2" />
        </div>
        <div className="hidden h-6 w-36 rounded-full bg-surface-2 sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-[260px] rounded-[22px] bg-surface-2 lg:col-span-8" />
        <div className="h-[260px] rounded-[20px] border border-line bg-surface lg:col-span-4" />
        <div className="h-[380px] rounded-[20px] border border-line bg-surface lg:col-span-8" />
        <div className="h-[380px] rounded-[20px] border border-line bg-surface lg:col-span-4" />
        <div className="h-[460px] rounded-[20px] border border-line bg-surface lg:col-span-8" />
        <div className="grid gap-5 lg:col-span-4">
          <div className="h-[300px] rounded-[20px] border border-line bg-surface" />
          <div className="h-[180px] rounded-[20px] border border-line bg-surface" />
        </div>
      </div>
    </div>
  );
}
