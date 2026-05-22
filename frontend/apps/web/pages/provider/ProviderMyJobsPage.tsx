import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';
import JobListCard from '../../components/JobListCard.tsx';

const PAGE_SIZE = 20;
const tabs = [
  { label: 'Accepted', statuses: ['accepted'] },
  { label: 'Ongoing', statuses: ['arrived', 'ongoing'] },
  { label: 'Completed', statuses: ['completed', 'paid'] },
];

function toCurrency(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

function statusPill(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'ongoing') return { label: 'In Progress', className: 'bg-blue-50 text-[#2F4DA0]' };
  if (s === 'arrived') return { label: 'Arrived', className: 'bg-emerald-50 text-emerald-600' };
  if (s === 'completed' || s === 'paid') return { label: 'Completed', className: 'bg-emerald-50 text-emerald-600' };
  return { label: 'Accepted', className: 'bg-blue-50 text-[#2F4DA0]' };
}

function categoryPill(category) {
  return {
    label: category || 'General',
    className: 'bg-blue-50 text-blue-600',
  };
}

function formatShortDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusLine(job, badgeLabel) {
  const status = String(job?.status || '').toLowerCase();
  if (status === 'completed' || status === 'paid') {
    const date = formatShortDate(job?.completedAt || job?.paidAt || job?.updatedAt);
    return date ? `Finished ${date}` : 'Finished';
  }
  if (status === 'accepted') {
    const date = formatShortDate(job?.acceptedAt || job?.updatedAt || job?.createdAt);
    return date ? `Accepted ${date}` : 'Accepted';
  }
  if (status === 'arrived') {
    const date = formatShortDate(job?.arrivedAt || job?.updatedAt);
    return date ? `Arrived ${date}` : 'Arrived';
  }
  return badgeLabel;
}

function formatLocation(job) {
  const customer = job?.customerId || {};
  return [customer.city, customer.district].filter(Boolean).join(', ') || 'Sri Lanka';
}

export default function ProviderMyJobsPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('Ongoing');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [tabCounts, setTabCounts] = useState({ Accepted: 0, Ongoing: 0, Completed: 0 });

  const activeStatuses = useMemo(() => tabs.find((item) => item.label === activeTab)?.statuses || ['ongoing'], [activeTab]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [activeTab]);

  useEffect(() => {
    let mounted = true;
    async function loadTabCounts() {
      if (!accessToken) return;
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const responses = await Promise.all(
          tabs.map((tab) =>
            apiRequest(`/providers/jobs?status=${tab.statuses.join(',')}&page=1&limit=1`, { headers }).catch(() => ({ pagination: { total: 0 } }))
          )
        );
        if (!mounted) return;
        setTabCounts({
          Accepted: Number(responses[0]?.pagination?.total || 0),
          Ongoing: Number(responses[1]?.pagination?.total || 0),
          Completed: Number(responses[2]?.pagination?.total || 0),
        });
      } catch {
        if (mounted) setTabCounts({ Accepted: 0, Ongoing: 0, Completed: 0 });
      }
    }
    loadTabCounts();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let mounted = true;
    async function loadJobs() {
      if (!accessToken) return;
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest(
          `/providers/jobs?status=${activeStatuses.join(',')}&page=${pagination.page}&limit=${PAGE_SIZE}`,
          { headers }
        );
        if (!mounted) return;
        setJobs(Array.isArray(response?.data) ? response.data : []);
        setPagination({
          page: Number(response?.pagination?.page || 1),
          total: Number(response?.pagination?.total || 0),
          totalPages: Number(response?.pagination?.totalPages || 1),
        });
      } catch {
        if (mounted) {
          setJobs([]);
          setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadJobs();
    return () => {
      mounted = false;
    };
  }, [accessToken, activeStatuses, pagination.page]);

  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.totalPages;

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Jobs</h1>
        <Link className="border border-[#2F4DA0] text-[#2F4DA0] px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors" to="/provider/browse-jobs">
          <span className="material-symbols-outlined text-lg">search</span>
          Browse New Jobs
        </Link>
      </div>

      <div className="border-b border-slate-200 flex items-center gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            className={`px-2 py-4 text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === tab.label ? 'text-[#2F4DA0] border-b-2 border-[#2F4DA0]' : 'text-slate-400 hover:text-slate-600'
            }`}
            type="button"
            onClick={() => setActiveTab(tab.label)}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === tab.label ? 'bg-blue-100 text-[#2F4DA0]' : 'bg-slate-100 text-slate-500'}`}>
              {tabCounts[tab.label] || 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <section className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={`skeleton-myjobs-${index}`} className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-50">
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
        {!loading && jobs.map((job) => {
          const badge = statusPill(job.status);
          const category = categoryPill(job.category);
          return (
            <JobListCard
              key={job._id}
              badges={[
                { label: category.label, className: category.className },
                { label: badge.label, className: badge.className },
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
                  icon: 'timer',
                  label: 'Status',
                  value: statusLine(job, badge.label),
                  valueClassName: 'text-slate-900',
                },
              ]}
              rightSummary={{ label: 'Budget', value: toCurrency(job.price) }}
              actions={
                <>
                  <Link
                    className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
                    to="/provider/messages"
                    state={{
                      customerId: job.customerId?._id || job.customerId || '',
                      customerName: job.customerId?.name || 'Customer',
                      customerAvatar: job.customerId?.profileImage || '',
                      jobId: job._id,
                      jobTitle: job.title || 'Job Conversation',
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">chat_bubble</span>
                    Message
                  </Link>
                  <Link className="bg-[#2F4DA0] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors shadow-sm" to={`/provider/jobs/${job._id}`}>
                    Job Details
                  </Link>
                </>
              }
            />
          );
        })}
        {!loading && !jobs.length ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 text-sm text-slate-500">No jobs in this tab yet.</div>
        ) : null}
      </section>

      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{jobs.length}</span> of <span className="font-semibold text-slate-900">{pagination.total}</span> {activeTab.toLowerCase()} jobs
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

