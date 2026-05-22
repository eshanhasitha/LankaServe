import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { SERVICE_CATEGORY_OPTIONS } from '../../lib/service-categories.ts';
import Skeleton from '../../components/Skeleton.tsx';
import JobListCard from '../../components/JobListCard.tsx';

const PAGE_SIZE = 20;

function toCurrencyRange(value) {
  const amount = Number(value || 0);
  return `LKR ${amount.toLocaleString()}`;
}

function timeAgo(iso) {
  if (!iso) return 'Recently';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return 'Yesterday';
}

function formatLocation(job) {
  const customer = job?.customerId || {};
  return [customer.city, customer.district].filter(Boolean).join(', ') || 'Sri Lanka';
}

export default function ProviderBrowseJobsPage() {
  const { accessToken } = useAuth();
  const [filters, setFilters] = useState({ category: '', district: '', minPrice: '', maxPrice: '' });
  const [appliedFilters, setAppliedFilters] = useState({ category: '', district: '', minPrice: '', maxPrice: '' });
  const [providerCategories, setProviderCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadProviderCategories() {
      if (!accessToken) return;
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest('/providers/me', { headers });
        if (!mounted) return;
        const categories = Array.isArray(response?.data?.categories) ? response.data.categories.filter(Boolean) : [];
        setProviderCategories(categories);
      } catch {
        if (mounted) setProviderCategories([]);
      }
    }
    loadProviderCategories();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [appliedFilters]);

  useEffect(() => {
    let mounted = true;
    async function loadJobs() {
      if (!accessToken) return;
      setLoading(true);
      setError('');
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const params = new URLSearchParams({ page: String(pagination.page), limit: String(PAGE_SIZE) });
        if (appliedFilters.category) params.set('category', appliedFilters.category);
        if (appliedFilters.minPrice) params.set('minPrice', appliedFilters.minPrice);
        if (appliedFilters.maxPrice) params.set('maxPrice', appliedFilters.maxPrice);

        const response = await apiRequest(`/providers/browse-jobs?${params.toString()}`, { headers });
        if (!mounted) return;
        setJobs(Array.isArray(response?.data) ? response.data : []);
        setPagination({
          page: Number(response?.pagination?.page || pagination.page || 1),
          total: Number(response?.pagination?.total || 0),
          totalPages: Number(response?.pagination?.totalPages || 1),
        });
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load jobs');
        setJobs([]);
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadJobs();
    return () => {
      mounted = false;
    };
  }, [accessToken, appliedFilters, pagination.page]);

  async function onAccept(jobId) {
    if (!jobId || !accessToken) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await apiRequest(`/jobs/${jobId}/accept`, { method: 'PUT', headers });
      setJobs((prev) => prev.filter((item) => String(item._id) !== String(jobId)));
    } catch {
      // Preserve page state on action error.
    }
  }

  async function onReject(jobId) {
    if (!jobId || !accessToken) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await apiRequest(`/jobs/${jobId}/reject`, { method: 'PUT', headers });
      setJobs((prev) => prev.filter((item) => String(item._id) !== String(jobId)));
    } catch {
      // Preserve page state on action error.
    }
  }

  const displayJobs = useMemo(() => {
    if (jobs.length) return jobs;
    return [];
  }, [jobs]);
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.totalPages;

  const categoryOptions = useMemo(() => {
    if (providerCategories.length) {
      return providerCategories.map((category) => ({ value: category, label: category }));
    }
    return SERVICE_CATEGORY_OPTIONS;
  }, [providerCategories]);

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Browse Jobs</h1>
        <p className="text-slate-500 text-sm">Review and manage incoming service opportunities in your area.</p>
      </div>

      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
            <select
              className="w-full border-slate-200 rounded-lg text-sm focus:ring-[#2F4DA0] focus:border-[#2F4DA0]"
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Location (District)</label>
            <select
              className="w-full border-slate-200 rounded-lg text-sm focus:ring-[#2F4DA0] focus:border-[#2F4DA0]"
              value={filters.district}
              onChange={(event) => setFilters((prev) => ({ ...prev, district: event.target.value }))}
            >
              <option value="">All Districts</option>
              <option value="Colombo">Colombo</option>
              <option value="Gampaha">Gampaha</option>
              <option value="Kandy">Kandy</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Min Budget</label>
            <input
              className="w-full border-slate-200 rounded-lg text-sm focus:ring-[#2F4DA0] focus:border-[#2F4DA0]"
              placeholder="5000"
              value={filters.minPrice}
              onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Max Budget</label>
            <input
              className="w-full border-slate-200 rounded-lg text-sm focus:ring-[#2F4DA0] focus:border-[#2F4DA0]"
              placeholder="50000"
              value={filters.maxPrice}
              onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              className="flex-1 bg-[#2F4DA0] text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm"
              type="button"
              onClick={() => setAppliedFilters(filters)}
            >
              Apply Filters
            </button>
            <button
              className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
              type="button"
              onClick={() => {
                const reset = { category: '', district: '', minPrice: '', maxPrice: '' };
                setFilters(reset);
                setAppliedFilters(reset);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <section className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={`skeleton-browse-${index}`} className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-6 w-80 mb-4" />
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
        {!loading && displayJobs.map((job) => (
          <JobListCard
            key={job._id}
            badges={[
              { label: job.category || 'General', className: 'bg-blue-100 text-[#2F4DA0]' },
              { label: 'Open', className: 'bg-orange-100 text-orange-600' },
            ]}
            title={job.title || 'Untitled Job'}
            infoBlocks={[
              {
                type: 'avatar',
                image: job?.customerId?.profileImage,
                name: job?.customerId?.name || 'Customer',
                label: 'Customer',
                value: job?.customerId?.name || 'Customer',
              },
              {
                type: 'icon',
                icon: 'location_on',
                label: 'Location',
                value: formatLocation(job),
              },
              {
                type: 'icon',
                icon: 'schedule',
                label: 'Posted',
                value: timeAgo(job.createdAt),
              },
            ]}
            description={job.description || 'No description available.'}
            rightSummary={{ label: 'Budget', value: toCurrencyRange(job.price) }}
            actions={
              <>
                <Link className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors" to={`/provider/jobs/${job._id}`}>
                  Job Details
                </Link>
                <button className="border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors" type="button" onClick={() => onReject(job._id)}>
                  Reject
                </button>
                <button className="bg-[#2F4DA0] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors shadow-sm" type="button" onClick={() => onAccept(job._id)}>
                  Accept Job
                </button>
              </>
            }
          />
        ))}
        {!loading && !displayJobs.length ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 text-sm text-slate-500">No open jobs found for current filters.</div>
        ) : null}
      </section>
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{displayJobs.length}</span> of <span className="font-semibold text-slate-900">{pagination.total}</span> open jobs
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

