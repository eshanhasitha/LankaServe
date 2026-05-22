function SkeletonBlock({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

function SkeletonText({ className = '' }) {
  return <SkeletonBlock className={`h-4 ${className}`} />;
}

function SkeletonCircle({ className = '' }) {
  return <SkeletonBlock className={`rounded-full ${className}`} />;
}

export function TableSkeletonRows({ columns, rows = 5, widths = [] }) {
  return Array.from({ length: rows }).map((_, rowIndex) => (
    <tr key={`skeleton-row-${rowIndex}`} className="border-b border-slate-50">
      {Array.from({ length: columns }).map((__, columnIndex) => {
        const width = widths[columnIndex] || widths[widths.length - 1] || 'w-3/4';
        const isActionColumn = columnIndex === columns - 1;
        return (
          <td key={`skeleton-cell-${rowIndex}-${columnIndex}`} className="px-6 py-5 align-middle">
            <SkeletonBlock className={`${width} ${isActionColumn ? 'ml-auto h-9 w-9 rounded-lg' : 'h-4'} ${columnIndex === 0 ? 'max-w-56' : ''}`} />
          </td>
        );
      })}
    </tr>
  ));
}

export function CardSkeletonGrid({ cards = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={`card-skeleton-${index}`} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="space-y-2">
              <SkeletonText className="h-3 w-24" />
              <SkeletonText className="h-8 w-16" />
            </div>
            <SkeletonCircle className="h-10 w-10" />
          </div>
          <SkeletonText className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeletonGrid />

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-6">
          <div className="mb-6 flex items-center justify-between">
            <SkeletonText className="h-4 w-40" />
            <SkeletonText className="h-8 w-20 rounded-lg" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`dashboard-bar-${index}`} className="space-y-2">
                <div className="flex justify-between">
                  <SkeletonText className="h-3 w-24" />
                  <SkeletonText className="h-3 w-10" />
                </div>
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <SkeletonText className="h-4 w-32" />
            <SkeletonText className="h-8 w-24 rounded-lg" />
          </div>
          <SkeletonBlock className="h-40 w-full rounded-2xl" />
        </div>
      </section>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-50 p-6">
            <SkeletonText className="h-4 w-32" />
            <SkeletonText className="h-8 w-20" />
          </div>
          <div className="space-y-4 p-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`activity-skeleton-${index}`} className="flex items-center gap-3">
                <SkeletonCircle className="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <SkeletonText className="h-3 w-1/3" />
                  <SkeletonText className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-4">
          <SkeletonText className="mb-6 h-4 w-40" />
          <div className="flex justify-center">
            <SkeletonBlock className="h-40 w-40 rounded-full" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonText key={`dist-skeleton-${index}`} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 p-6">
          <SkeletonText className="h-4 w-36" />
          <SkeletonText className="h-8 w-24" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-100">
              <TableSkeletonRows columns={4} rows={4} widths={['w-28', 'w-24', 'w-28', 'w-16']} />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeletonGrid />

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-8">
          <div className="mb-8 flex items-center justify-between">
            <SkeletonText className="h-4 w-44" />
            <SkeletonText className="h-8 w-24 rounded-lg" />
          </div>
          <div className="flex h-64 items-end gap-4 px-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`analytics-bar-${index}`} className="flex flex-1 flex-col items-center gap-3">
                <SkeletonBlock className="h-40 w-full rounded-t-lg" />
                <SkeletonText className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-4">
          <SkeletonText className="mb-6 h-4 w-56" />
          <div className="flex flex-1 flex-col items-center justify-center">
            <SkeletonBlock className="h-40 w-40 rounded-full" />
            <div className="mt-8 grid w-full grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonText key={`analytics-meta-${index}`} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonText className="h-4 w-36" />
              <SkeletonText className="h-3 w-52" />
            </div>
            <SkeletonText className="h-8 w-28" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-50">
                <TableSkeletonRows columns={3} rows={5} widths={['w-40', 'w-28', 'w-16']} />
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}