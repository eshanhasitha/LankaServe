import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';
import JobListCard from '../../components/JobListCard.tsx';

const PAGE_SIZE = 20;

function toCurrency(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

function formatLocation(job) {
  const customer = job?.customerId || {};
  return [customer.city, customer.district].filter(Boolean).join(', ') || 'Sri Lanka';
}

function timeAgo(iso) {
  if (!iso) return 'Recently';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return 'Yesterday';
}

export default function ProviderJobRequestsPage() {
  const { accessToken } = useAuth();
  const [distance, setDistance] = useState('Within 5 km');
  const [sortBy, setSortBy] = useState('Newest');
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [distance, sortBy]);

  useEffect(() => {
    let mounted = true;
    async function loadRequests() {
      if (!accessToken) return;
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest(`/providers/job-requests?page=${pagination.page}&limit=${PAGE_SIZE}`, { headers });
        if (!mounted) return;
        const items = Array.isArray(response?.data) ? response.data : [];
        setRequests(items);
        setPagination({
          page: Number(response?.pagination?.page || pagination.page || 1),
          total: Number(response?.pagination?.total || 0),
          totalPages: Number(response?.pagination?.totalPages || 1),
        });
      } catch {
        if (mounted) {
          setRequests([]);
          setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRequests();
    return () => {
      mounted = false;
    };
  }, [accessToken, distance, sortBy, pagination.page]);

  async function onAccept(jobId) {
    if (!accessToken || !jobId) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await apiRequest(`/jobs/${jobId}/accept`, { method: 'PUT', headers });
      setRequests((prev) => prev.filter((item) => String(item._id) !== String(jobId)));
    } catch {
      // Keep list unchanged on action failures.
    }
  }

  async function onReject(jobId) {
    if (!accessToken || !jobId) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await apiRequest(`/jobs/${jobId}/reject`, { method: 'PUT', headers });
      setRequests((prev) => prev.filter((item) => String(item._id) !== String(jobId)));
    } catch {
      // Keep list unchanged on action failures.
    }
  }

  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.totalPages;

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incoming Job Requests</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage new job requests sent by customers.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Distance</label>
            <select className="bg-white border-slate-200 rounded-xl text-sm font-medium py-2 px-3 focus:ring-[#2F4DA0] focus:border-[#2F4DA0]" value={distance} onChange={(event) => setDistance(event.target.value)}>
              <option>Within 5 km</option>
              <option>Within 10 km</option>
              <option>Within 25 km</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Sort By</label>
            <select className="bg-white border-slate-200 rounded-xl text-sm font-medium py-2 px-3 focus:ring-[#2F4DA0] focus:border-[#2F4DA0]" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option>Newest</option>
              <option>Nearest</option>
              <option>Highest Budget</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <section className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={`skeleton-requests-${index}`} className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
              <Skeleton className="h-5 w-28 mb-4" />
              <Skeleton className="h-6 w-72 mb-4" />
              <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="space-y-4">
        {!loading && requests.map((item) => (
          <JobListCard
            key={item._id}
            badges={[
              { label: item.category || 'General', className: 'bg-blue-100 text-[#2F4DA0]' },
              { label: 'Open', className: 'bg-orange-100 text-orange-600' },
            ]}
            title={item.title || 'Untitled Job'}
            infoBlocks={[
              {
                type: 'avatar',
                image: item?.customerId?.profileImage,
                name: item?.customerId?.name || 'Customer',
                label: 'Customer',
                value: item?.customerId?.name || 'Customer',
              },
              {
                type: 'icon',
                icon: 'location_on',
                label: 'Location',
                value: formatLocation(item),
              },
              {
                type: 'icon',
                icon: 'schedule',
                label: 'Posted',
                value: timeAgo(item.createdAt),
              },
            ]}
            description={item.description || 'No description available.'}
            rightSummary={{ label: 'Budget', value: toCurrency(item.price) }}
            actions={
              <>
                <Link className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors" to={`/provider/jobs/${item._id}`}>
                  Job Details
                </Link>
                <button className="border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors" type="button" onClick={() => onReject(item._id)}>
                  Reject
                </button>
                <button className="bg-[#2F4DA0] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors shadow-sm" type="button" onClick={() => onAccept(item._id)}>
                  Accept Job
                </button>
              </>
            }
          />
        ))}
        {!loading && !requests.length ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 text-sm text-slate-500">No pending job requests.</div>
        ) : null}
      </section>

      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{requests.length}</span> of <span className="font-semibold text-slate-900">{pagination.total}</span> pending requests
        </p>
        <div className="flex items-center gap-2">
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${
              canPrev ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-slate-100 text-slate-300 cursor-not-allowed'
            }`}
            type="button"
            onClick={() => canPrev && setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={!canPrev}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${
              canNext ? 'border-[#2F4DA0] text-[#2F4DA0] hover:bg-blue-50' : 'border-slate-100 text-slate-300 cursor-not-allowed'
            }`}
            type="button"
            onClick={() => canNext && setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={!canNext}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}

