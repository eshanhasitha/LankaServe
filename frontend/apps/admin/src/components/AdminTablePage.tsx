import AdminPageHeader from './AdminPageHeader.tsx';
import AdminPagination from './AdminPagination.tsx';
import { TableSkeletonRows } from './AdminSkeletons.tsx';

export default function AdminTablePage({
  title,
  subtitle,
  loading,
  error,
  rows,
  columns,
  emptyMessage,
  pagination,
  onPageChange,
  actions,
}) {
  return (
    <section className="grid gap-5">
      <AdminPageHeader title={title} subtitle={subtitle} actions={actions} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                    >
                      <div className="animate-pulse rounded-full bg-slate-200/80 py-2" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TableSkeletonRows columns={columns.length} rows={5} widths={columns.map((column) => column.width || 'w-3/4')} />
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && !rows.length ? (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        ) : null}

        {!loading && !error && rows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row._id || row.id || index}>
                      {columns.map((column) => (
                        <td key={column.key} className="border-b border-slate-100 px-4 py-4 align-top text-sm text-slate-700">
                          {column.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination pagination={pagination} onPageChange={onPageChange} />
          </>
        ) : null}
      </div>
    </section>
  );
}

