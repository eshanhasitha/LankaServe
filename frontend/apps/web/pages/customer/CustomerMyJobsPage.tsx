import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { reverseGeocodeLocation } from '../../lib/location.ts';
import Skeleton from '../../components/Skeleton.tsx';
import JobListCard from '../../components/JobListCard.tsx';

const tabs = ['All', 'Pending', 'Accepted', 'Ongoing', 'Completed', 'Cancelled'];
const PAGE_SIZE = 6;

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'in_progress' || value === 'started' || value === 'arrived') return 'Ongoing';
  if (value === 'paid') return 'Completed';
  if (value === 'rejected') return 'Cancelled';
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending';
}

function statusStyles(status) {
  const s = normalizeStatus(status);
  if (s === 'Ongoing') return 'bg-orange-50 text-[#F59E0B]';
  if (s === 'Completed') return 'bg-emerald-50 text-emerald-600';
  if (s === 'Pending') return 'bg-slate-100 text-slate-500';
  if (s === 'Accepted') return 'bg-blue-50 text-blue-600';
  if (s === 'Cancelled') return 'bg-red-50 text-red-600';
  return 'bg-slate-100 text-slate-500';
}

function getPageNumbers(current, total) {
  if (total <= 1) return [1];
  const relevant = new Set([1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...relevant].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null);
    result.push(sorted[i]);
  }
  return result;
}

function formatDateText(dateValue) {
  if (!dateValue) return 'Posted recently';
  return `Posted ${new Date(dateValue).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })}`;
}

function formatDurationText(job) {
  const status = normalizeStatus(job?.status);
  if (status === 'Completed' && job?.completedAt) {
    return `Finished ${new Date(job.completedAt).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })}`;
  }
  if (status === 'Accepted') return 'Provider assigned';
  if (status === 'Ongoing') return 'Work in progress';
  if (status === 'Cancelled') return 'Request cancelled';
  return 'Awaiting provider';
}

function resolveProviderProfile(providers, providerId) {
  const providerUserId = getProviderUserId(providerId);
  if (!providerUserId) return null;
  return providers.find((item) => String(item?.userId?._id || item?.userId) === providerUserId) || null;
}

function getProviderUserId(providerId) {
  if (!providerId) return '';
  if (typeof providerId === 'string') return providerId;
  if (typeof providerId === 'object') return String(providerId._id || providerId.id || '');
  return String(providerId);
}

async function loadMissingProviderProfiles(items, providers, headers) {
  const missingProviderIds = [
    ...new Set(
      items
        .map((job) => job.providerId)
        .filter(Boolean)
        .map((providerId) => getProviderUserId(providerId))
        .filter(Boolean)
        .filter((providerId) => !resolveProviderProfile(providers, providerId))
    ),
  ];

  if (!missingProviderIds.length) return providers;

  const fallbackProfiles = await Promise.all(
    missingProviderIds.map(async (providerId) => {
      try {
        const response = await apiRequest(`/providers/${providerId}`, { headers });
        return response?.data || null;
      } catch {
        return null;
      }
    })
  );

  return [...providers, ...fallbackProfiles.filter(Boolean)];
}

export default function CustomerMyJobsPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('Ongoing');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [cancellingJobId, setCancellingJobId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const [jobsResponse, providersResponse] = await Promise.all([
          apiRequest('/jobs?limit=200&page=1', { headers }),
          apiRequest('/providers?limit=100', { headers }).catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;

        const items = Array.isArray(jobsResponse?.data) ? jobsResponse.data : [];
        const listedProviders = Array.isArray(providersResponse?.data) ? providersResponse.data : [];
        const providers = await loadMissingProviderProfiles(items, listedProviders, headers);
        const enrichedItems = await Promise.all(
          items.map(async (job) => {
            const locationInfo = await reverseGeocodeLocation(job.location);
            const providerProfile = resolveProviderProfile(providers, job.providerId);
            return {
              ...job,
              locationText: locationInfo.shortLabel,
              locationLabel: locationInfo.label,
              dateText: formatDateText(job.createdAt),
              durationText: formatDurationText(job),
              providerName: providerProfile?.userId?.name || '',
              providerImage: providerProfile?.userId?.profileImage || '',
            };
          })
        );

        if (!mounted) return;
        setJobs(enrichedItems);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load jobs');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const filteredJobs = useMemo(() => {
    if (activeTab === 'All') return jobs;
    return jobs.filter((job) => normalizeStatus(job.status) === activeTab);
  }, [jobs, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));

  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredJobs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredJobs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function onCancelJob(jobId) {
    if (!jobId) return;
    if (!window.confirm('Cancel this job request?')) return;

    try {
      setError('');
      setCancellingJobId(jobId);
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      await apiRequest(`/jobs/${jobId}/cancel`, { method: 'PUT', headers });
      setJobs((prev) => prev.map((job) => (
        job._id === jobId
          ? { ...job, status: 'cancelled', durationText: 'Request cancelled' }
          : job
      )));
    } catch (cancelError) {
      setError(cancelError.message || 'Failed to cancel job');
    } finally {
      setCancellingJobId('');
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Jobs</h1>
          <p className="text-slate-500">Track and manage your active service requests.</p>
        </div>
        <Link className="bg-[#2F4DA0] text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-all" to="/customer/post-service">
          <span className="material-symbols-outlined text-lg">add</span>
          Post a Service
        </Link>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`pb-4 text-sm font-medium ${activeTab === tab ? 'text-[#2F4DA0] border-b-2 border-[#2F4DA0]' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex justify-between">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {paginatedJobs.map((job) => {
          const normalized = normalizeStatus(job.status);
          const actionNode = normalized === 'Completed' ? (
            <>
              <Link
                className="bg-slate-50 text-[#2F4DA0] px-6 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-100 transition-all text-center"
                to={`/customer/my-jobs/${job._id}`}
                state={{ jobTitle: job.title || 'Job Details' }}
              >
                View Details
              </Link>
              <Link className="text-xs font-bold text-[#2F4DA0] hover:underline" to={`/customer/my-jobs/${job._id}`}>
                Rate Provider
              </Link>
            </>
          ) : normalized === 'Cancelled' ? (
            <p className="text-xs font-semibold text-red-600">Cancelled</p>
          ) : (
            <>
              <Link
                className="bg-slate-50 text-[#2F4DA0] px-6 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-100 transition-all text-center"
                to={`/customer/my-jobs/${job._id}`}
                state={{ jobTitle: job.title || 'Job Details' }}
              >
                View Details
              </Link>
              <button
                className="bg-red-50 text-red-600 px-6 py-2 rounded-xl text-sm font-bold border border-red-200 hover:bg-red-100 transition-all disabled:opacity-70"
                disabled={cancellingJobId === job._id || !jobs.length}
                onClick={() => onCancelJob(job._id)}
                type="button"
              >
                {cancellingJobId === job._id ? 'Cancelling...' : 'Cancel Job'}
              </button>
            </>
          );

          return (
            <JobListCard
              key={job._id}
              className="transition-all hover:-translate-y-0.5 hover:shadow-lg"
              badges={[
                { label: job.category || 'General', className: 'bg-blue-50 text-blue-600' },
                { label: normalized, className: statusStyles(job.status) },
              ]}
              title={job.title || 'Untitled Job'}
              infoBlocks={[
                {
                  type: job.providerName ? 'avatar' : 'icon',
                  image: job.providerImage,
                  name: job.providerName || 'Provider',
                  icon: 'person',
                  label: 'Service Provider',
                  value: job.providerName || 'Awaiting Provider',
                  valueClassName: job.providerName ? 'text-slate-900' : 'text-slate-400 italic',
                },
                {
                  type: 'icon',
                  icon: 'location_on',
                  label: 'Location',
                  value: job.locationText || 'Colombo 07',
                },
                {
                  type: 'icon',
                  icon: 'timer',
                  label: 'Status',
                  value: job.durationText || 'Awaiting provider',
                },
              ]}
              rightSummary={{ label: 'Budget', value: `LKR ${Number(job.budget || job.price || 0).toLocaleString()}` }}
              actions={actionNode}
            />
          );
        })}
        {!loading && paginatedJobs.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-3">
            <span className="material-symbols-outlined text-slate-300 text-4xl">work_off</span>
            <p className="text-sm font-medium text-slate-500">No jobs found for this tab.</p>
            <Link className="text-sm font-semibold text-[#2F4DA0] hover:underline" to="/customer/post-service">
              Post a Service
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-slate-500">
          Showing {paginatedJobs.length} of {filteredJobs.length} {activeTab.toLowerCase()} jobs
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              type="button"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {getPageNumbers(currentPage, totalPages).map((page, i) =>
              page === null ? (
                <span key={`ellipsis-${i}`} className="w-10 text-center text-slate-400 text-sm select-none">…</span>
              ) : (
                <button
                  key={page}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold ${currentPage === page ? 'bg-[#2F4DA0] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setCurrentPage(page)}
                  type="button"
                >
                  {page}
                </button>
              )
            )}
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-40"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              type="button"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

