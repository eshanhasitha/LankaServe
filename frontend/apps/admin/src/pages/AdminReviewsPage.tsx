import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';
import { TableSkeletonRows } from '../components/AdminSkeletons.tsx';

const negativeWords = ['poor', 'bad', 'spam', 'offensive', 'scam', 'fake', 'abuse', 'rude'];

function getFeedbackType(review) {
  const rating = Number(review?.rating || 0);
  const text = String(review?.comment || '').toLowerCase();
  const hasNegative = negativeWords.some((word) => text.includes(word));
  if (rating <= 2 || hasNegative) return 'complaint';
  if (rating >= 4) return 'compliment';
  return 'suggestion';
}

function estimateFlags(review) {
  const type = getFeedbackType(review);
  if (type !== 'complaint') return 0;
  const text = String(review?.comment || '').toLowerCase();
  if (text.includes('spam') || text.includes('offensive') || text.includes('abuse')) return 5;
  if (text.includes('poor') || text.includes('bad')) return 2;
  return 1;
}

function formatDateParts(value) {
  if (!value) return { date: '-', time: '-' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '-', time: '-' };
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

function Avatar({ name, image, className = 'h-9 w-9' }) {
  const initial = String(name || 'U').trim().charAt(0).toUpperCase() || 'U';
  if (image) return <img alt={name || 'User'} className={`${className} rounded-full border border-slate-100 object-cover`} src={image} />;
  return <div className={`flex ${className} items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500`}>{initial}</div>;
}

function RatingStars({ rating }) {
  const value = Number(rating || 0);
  return (
    <div className="flex gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map((star) => {
        let icon = 'star';
        let fill = 0;
        if (value >= star) {
          fill = 1;
        } else if (value >= star - 0.5) {
          icon = 'star_half';
          fill = 1;
        }
        return (
          <span key={star} className="material-symbols-outlined text-lg" style={{ fontVariationSettings: `'FILL' ${fill}` }}>
            {icon}
          </span>
        );
      })}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { authorizedRequest } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [usersMap, setUsersMap] = useState(new Map());
  const [providerMap, setProviderMap] = useState(new Map());
  const [resolvedIds, setResolvedIds] = useState(() => new Set());
  const [escalatedIds, setEscalatedIds] = useState(() => new Set());

  const [ratingFilter, setRatingFilter] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [feedbackType, setFeedbackType] = useState('all');

  const loadReviews = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const [reviewsResponse, usersResponse, providersResponse] = await Promise.all([
        authorizedRequest(`/admin/reviews?page=${targetPage}&limit=20`),
        authorizedRequest('/admin/users?page=1&limit=400'),
        authorizedRequest('/providers?page=1&limit=400'),
      ]);

      const reviewItems = Array.isArray(reviewsResponse?.data) ? reviewsResponse.data : [];
      const userItems = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
      const providerItems = Array.isArray(providersResponse?.data) ? providersResponse.data : [];

      setRows(reviewItems);
      setPagination(reviewsResponse?.pagination || { page: targetPage, totalPages: 1, total: reviewItems.length });
      setUsersMap(new Map(userItems.map((user) => [String(user._id), user])));

      const providerByUserId = new Map();
      providerItems.forEach((provider) => {
        const userId = provider?.userId?._id || provider?.userId;
        if (userId) providerByUserId.set(String(userId), provider);
      });
      setProviderMap(providerByUserId);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [authorizedRequest]);

  useEffect(() => {
    loadReviews(page);
  }, [loadReviews, page]);

  async function deleteReview(reviewId) {
    try {
      await authorizedRequest(`/reviews/${reviewId}`, { method: 'DELETE' });
      await loadReviews(page);
    } catch (actionError) {
      setError(actionError.message || 'Failed to delete review');
    }
  }

  const normalizedRows = useMemo(() => {
    return rows.map((row) => {
      const providerUser = usersMap.get(String(row?.providerId || ''));
      const customerUser = usersMap.get(String(row?.customerId || ''));
      const providerProfile = providerMap.get(String(row?.providerId || ''));
      const flags = estimateFlags(row);
      return {
        ...row,
        providerName: providerUser?.name || 'Provider',
        providerImage: providerUser?.profileImage || '',
        providerCategory: providerProfile?.categories?.[0] || 'Service',
        customerName: customerUser?.name || 'Customer',
        customerImage: customerUser?.profileImage || '',
        flags,
        feedbackType: getFeedbackType(row),
        dateParts: formatDateParts(row?.createdAt),
      };
    });
  }, [providerMap, rows, usersMap]);

  const filteredRows = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return normalizedRows.filter((row) => {
      const ratingOk = !ratingFilter || Number(row?.rating || 0) >= ratingFilter;
      const typeOk = feedbackType === 'all' || row.feedbackType === feedbackType;
      const keywordOk = !key ||
        row.providerName.toLowerCase().includes(key) ||
        row.customerName.toLowerCase().includes(key) ||
        String(row.comment || '').toLowerCase().includes(key);
      return ratingOk && typeOk && keywordOk;
    });
  }, [normalizedRows, ratingFilter, feedbackType, keyword]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Review Moderation</h1>
          <p className="mt-1 text-sm text-slate-500">Manage and moderate marketplace feedback across the platform.</p>
        </div>
        <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50">
          <span className="material-symbols-outlined text-lg">download</span>
          Export Data
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Rating</label>
            <div className="flex w-fit items-center gap-1 rounded-lg bg-slate-50 p-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" className="p-1 transition-colors hover:text-amber-500" onClick={() => setRatingFilter((prev) => (prev === value ? 0 : value))}>
                  <span
                    className={`material-symbols-outlined text-xl ${value <= ratingFilter ? 'text-amber-500' : 'text-slate-300'}`}
                    style={{ fontVariationSettings: `'FILL' ${value <= ratingFilter ? 1 : 0}` }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Keyword Search</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><span className="material-symbols-outlined text-lg">search</span></span>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="w-full rounded-lg border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-(--primary)" placeholder="Search comments..." type="text" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Feedback Type</label>
            <select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)} className="w-full rounded-lg border-slate-200 bg-slate-50 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-(--primary)">
              <option value="all">All Types</option>
              <option value="compliment">Compliment</option>
              <option value="complaint">Complaint</option>
              <option value="suggestion">Suggestion</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Date Range</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><span className="material-symbols-outlined text-lg">calendar_today</span></span>
              <input className="w-full cursor-pointer rounded-lg border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-(--primary)" readOnly type="text" value="Oct 01 - Oct 31, 2023" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Rating</th>
                <th className="max-w-xs px-6 py-4">Comment</th>
                <th className="px-6 py-4">Flags</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <TableSkeletonRows columns={7} rows={5} widths={['w-40', 'w-28', 'w-20', 'w-full', 'w-20', 'w-28', 'w-24']} /> : null}
              {!loading && error ? (
                <tr><td colSpan={7} className="px-6 py-8 text-sm text-red-600">{error}</td></tr>
              ) : null}
              {!loading && !error && !filteredRows.length ? (
                <tr><td colSpan={7} className="px-6 py-8 text-sm text-slate-500">No reviews found.</td></tr>
              ) : null}

              {!loading && !error && filteredRows.map((row) => {
                const isEscalated = escalatedIds.has(String(row._id));
                const isResolved = resolvedIds.has(String(row._id));
                return (
                  <tr key={row._id} className={`transition-colors hover:bg-slate-50/50 ${row.flags > 0 ? 'bg-red-50/10' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.providerName} image={row.providerImage} />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{row.providerName}</span>
                          <span className="text-[10px] font-medium text-slate-500">{row.providerCategory}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.customerName} image={row.customerImage} />
                        <span className="text-sm font-medium text-slate-700">{row.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><RatingStars rating={row.rating} /></td>
                    <td className="px-6 py-4">
                      <p className="line-clamp-2 text-sm text-slate-600">{row.comment || '-'} </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.flags > 0 ? 'border border-red-200 bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {row.flags} Flags
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {row.dateParts.date}<br />{row.dateParts.time}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className={`rounded-lg p-1.5 transition-all ${isResolved ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                          title="Mark Resolved"
                          onClick={() => setResolvedIds((prev) => new Set([...prev, String(row._id)]))}
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                        <button
                          type="button"
                          className={`rounded-lg p-1.5 transition-all ${isEscalated ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'}`}
                          title="Escalate"
                          onClick={() => setEscalatedIds((prev) => new Set([...prev, String(row._id)]))}
                        >
                          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: `'FILL' ${isEscalated ? 1 : 0}` }}>flag</span>
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                          onClick={() => deleteReview(row._id)}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <p className="text-xs font-medium text-slate-500">Showing 1 to {filteredRows.length} of {pagination.total || 0} reviews</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="cursor-pointer rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`rounded border px-3 py-1 text-xs font-semibold ${page === n ? 'border-(--primary) bg-(--primary) text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {n}
              </button>
            ))}
            <span className="mx-1 text-slate-400">...</span>
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page >= Number(pagination.totalPages || 1)}
              className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

