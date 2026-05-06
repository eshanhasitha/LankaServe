export default function AdminPagination({ pagination, onPageChange }) {
  if (!pagination?.totalPages || pagination.totalPages <= 1) return null;

  const currentPage = Number(pagination.page || 1);

  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      <button
        type="button"
        disabled={currentPage <= 1}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-slate-500">Page {currentPage} of {pagination.totalPages}</span>
      <button
        type="button"
        disabled={currentPage >= pagination.totalPages}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
}
