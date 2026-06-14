import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { SERVICE_CATEGORY_OPTIONS } from '../../lib/service-categories.ts';
import Skeleton from '../../components/Skeleton.tsx';
import Avatar from '../../components/Avatar.tsx';

const PAGE_SIZE = 20;

function toCurrency(value: string | number) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

function timeAgo(iso: string) {
  if (!iso) return 'Recently';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return 'Yesterday';
}

function formatLocation(job: any) {
  const customer = job?.customerId || {};
  return [customer.city, customer.district].filter(Boolean).join(', ') || 'Sri Lanka';
}

export default function ProviderBrowseJobsPage() {
  const { accessToken } = useAuth();
  
  // Filtering & Data states
  const [filters, setFilters] = useState({ category: '', district: '', minPrice: '', maxPrice: '' });
  const [appliedFilters, setAppliedFilters] = useState({ category: '', district: '', minPrice: '', maxPrice: '' });
  const [providerCategories, setProviderCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ⚡ Premium Light-Themed Sliding Action Proposal Drawer States
  const [selectedBidJob, setSelectedBidJob] = useState<any>(null);
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('3');
  const [biddingBusy, setBiddingBusy] = useState(false);
  const [bidSuccess, setBidSuccess] = useState('');

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
    return () => { mounted = false; };
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
        if (appliedFilters.district) params.set('district', appliedFilters.district);

        const response = await apiRequest(`/providers/browse-jobs?${params.toString()}`, { headers });
        if (!mounted) return;
        setJobs(Array.isArray(response?.data) ? response.data : []);
        setPagination({
          page: Number(response?.pagination?.page || pagination.page || 1),
          total: Number(response?.pagination?.total || 0),
          totalPages: Number(response?.pagination?.totalPages || 1),
        });
      } catch (loadError: any) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load jobs database.');
        setJobs([]);
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadJobs();
    return () => { mounted = false; };
  }, [accessToken, appliedFilters, pagination.page]);

  async function onAcceptDirectly(jobId: string) {
    if (!jobId || !accessToken) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await apiRequest(`/jobs/${jobId}/accept`, { method: 'PUT', headers });
      setJobs((prev) => prev.filter((item: any) => String(item._id) !== String(jobId)));
    } catch {
      // Keep state on error
    }
  }

  async function onReject(jobId: string) {
    if (!jobId || !accessToken) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await apiRequest(`/jobs/${jobId}/reject`, { method: 'PUT', headers });
      setJobs((prev) => prev.filter((item: any) => String(item._id) !== String(jobId)));
    } catch {
      // Keep state on error
    }
  }

  async function handleBidSubmission(e: any) {
    e.preventDefault();
    if (!selectedBidJob?._id || !customBidAmount || biddingBusy) return;
    setBiddingBusy(true);
    setBidSuccess('');
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await apiRequest(`/jobs/${selectedBidJob._id}/bids`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: Number(customBidAmount),
          durationHours: Number(estimatedHours),
        }),
      });
      setBidSuccess('Proposal transmitted successfully into customer portal feed!');
      setTimeout(() => {
        setJobs((prev) => prev.filter((item: any) => String(item._id) !== String(selectedBidJob._id)));
        setSelectedBidJob(null);
        setCustomBidAmount('');
        setBidSuccess('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Proposal submission fault.');
    } finally {
      setBiddingBusy(false);
    }
  }

  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.totalPages;

  const categoryOptions = useMemo(() => {
    if (providerCategories.length) {
      return providerCategories.map((cat) => ({ value: cat, label: cat }));
    }
    return SERVICE_CATEGORY_OPTIONS;
  }, [providerCategories]);

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6 font-['Inter']">
      
      {/* Upper Title Segment */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Browse Jobs</h1>
          <p className="text-slate-400 text-xs font-medium mt-0.5">Submit proposal parameters or instantly lock active assignments near you.</p>
        </div>
        <div className="bg-[#2F4DA0]/5 border border-[#2F4DA0]/10 rounded-xl px-4 py-1.5 text-center shrink-0">
          <span className="text-[9px] font-bold text-[#2F4DA0] uppercase tracking-wider block">Open Positions</span>
          <span className="text-base font-black text-[#2F4DA0] font-mono">{pagination.total}</span>
        </div>
      </div>

      {/* Filter Row Module */}
      <section className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/60">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <div className="relative">
              <select
                className="w-full h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2F4DA0] focus:bg-white transition-all appearance-none cursor-pointer"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="">All Fields</option>
                {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-base">expand_more</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sri Lanka District</label>
            <div className="relative">
              <select
                className="w-full h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2F4DA0] focus:bg-white transition-all appearance-none cursor-pointer"
                value={filters.district}
                onChange={(e) => setFilters((prev) => ({ ...prev, district: e.target.value }))}
              >
                <option value="">All Districts</option>
                <option value="Colombo">Colombo</option>
                <option value="Gampaha">Gampaha</option>
                <option value="Kandy">Kandy</option>
                <option value="Galle">Galle</option>
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-base">expand_more</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Min Price (LKR)</label>
            <input
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2F4DA0] focus:bg-white transition-all placeholder:text-slate-300"
              placeholder="e.g., 2000"
              value={filters.minPrice}
              onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Max Price (LKR)</label>
            <input
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#2F4DA0] focus:bg-white transition-all placeholder:text-slate-300"
              placeholder="e.g., 30000"
              value={filters.maxPrice}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              className="flex-1 h-9 bg-[#2F4DA0] hover:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs border-none cursor-pointer"
              type="button"
              onClick={() => setAppliedFilters(filters)}
            >
              Filter Feed
            </button>
            <button
              className="h-9 px-3 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors bg-white cursor-pointer"
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

      {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

      {/* Main Grid View Container Workspace Partition */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Clean Independent Custom Job Rows */}
        <div className={`${selectedBidJob ? 'xl:col-span-8' : 'xl:col-span-12'} space-y-4`}>
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`sk-${idx}`} className="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                <Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-12 w-full" />
              </div>
            ))
          ) : jobs.map((job: any) => (
            <div 
              key={job._id} 
              className={`bg-white border p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 ${selectedBidJob?._id === job._id ? 'border-[#2F4DA0] ring-2 ring-[#2F4DA0]/5' : 'border-slate-200/70 hover:border-slate-300'}`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-[9px] font-black tracking-wider uppercase text-[#2F4DA0] rounded">
                    {job.category || 'General'}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-[9px] font-bold uppercase text-slate-500 rounded">
                    Open Request
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 tracking-tight">{job.title || 'Untitled Request'}</h3>
                <p className="text-xs font-medium text-slate-400 line-clamp-2 max-w-xl">{job.description || 'No descriptive criteria logged.'}</p>

                {/* 🛡️ Crucial Spatial Layout Fix: Render clean explicit horizontal metadata row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-left border-t border-slate-50 mt-2">
                  <div className="flex items-center gap-2">
                    <Avatar src={job?.customerId?.profileImage} name={job?.customerId?.name || 'C'} className="w-6 h-6 rounded-full border border-slate-100" />
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none mb-0.5">Customer</span>
                      <span className="text-xs font-bold text-slate-700 leading-none block">{job?.customerId?.name || 'Customer'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="material-symbols-outlined text-sm text-slate-400 font-bold">location_on</span>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none mb-0.5">Region Location</span>
                      <span className="text-xs font-bold text-slate-600 leading-none block">{formatLocation(job)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="material-symbols-outlined text-sm text-slate-400 font-bold">schedule</span>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none mb-0.5">Logged Index</span>
                      <span className="text-xs font-bold text-slate-600 leading-none block">{timeAgo(job.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Allocation Pricing & Button layout panel links */}
              <div className="flex flex-row md:flex-col items-end justify-between md:justify-center w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-none border-slate-100 gap-4">
                <div className="text-left md:text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Customer Budget</span>
                  <p className="text-base font-black text-[#2F4DA0] tracking-tight">{toCurrency(job.price)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Link className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center transition-colors" to={`/provider/jobs/${job._id}`}>
                    Details
                  </Link>
                  <button type="button" onClick={() => onReject(job._id)} className="h-8 px-2 border border-none text-red-500 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors bg-transparent cursor-pointer">
                    Dismiss
                  </button>
                  <button type="button" onClick={() => { setSelectedBidJob(job); setCustomBidAmount(String(job.price)); }} className="h-8 px-3 bg-amber-50 text-amber-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer hover:bg-amber-100">
                    Quote
                  </button>
                  <button type="button" onClick={() => onAcceptDirectly(job._id)} className="h-8 px-3 bg-[#2F4DA0] hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer shadow-2xs">
                    Accept
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!loading && !jobs.length && (
            <div className="bg-white border border-dashed border-slate-200 p-8 text-center rounded-2xl text-xs font-medium text-slate-400 italic">
              No service requirements listed match your trade settings right now.
            </div>
          )}
        </div>

        {/* ⚡ Right Side: Premium Clean White Action Bidding Drawer Panel */}
        {selectedBidJob && (
          <div className="col-span-1 xl:col-span-4 bg-white border-2 border-[#2F4DA0]/30 text-slate-900 p-5 rounded-2xl shadow-xl space-y-4 sticky top-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#2F4DA0] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">Proposal Panel</span>
                <h4 className="text-sm font-black text-slate-900 truncate max-w-[190px] mt-2 tracking-tight">{selectedBidJob.title}</h4>
              </div>
              <button type="button" onClick={() => setSelectedBidJob(null)} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-700 border-none flex items-center justify-center cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs font-medium text-slate-600">
              <div className="flex justify-between"><span>Customer Base:</span><span className="font-bold text-slate-900">{toCurrency(selectedBidJob.price)}</span></div>
              <div className="flex justify-between"><span>Region Target:</span><span className="font-bold text-slate-900 truncate max-w-[140px]">{formatLocation(selectedBidJob)}</span></div>
            </div>

            <form onSubmit={handleBidSubmission} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black tracking-widest uppercase text-slate-400 mb-1.5">Your Proposal Amount (LKR)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-slate-400">LKR</span>
                  <input 
                    type="number" 
                    className="w-full h-10 pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/5 text-slate-900 transition-all"
                    value={customBidAmount}
                    onChange={(e) => setCustomBidAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black tracking-widest uppercase text-slate-400 mb-1.5">Estimated Duration</label>
                <div className="relative flex items-center">
                  <input 
                    type="number" 
                    className="w-full h-10 pl-4 pr-14 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/5 text-slate-900 transition-all"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    required
                  />
                  <span className="absolute right-3.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Hours</span>
                </div>
              </div>

              {bidSuccess && <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center leading-normal">{bidSuccess}</p>}

              <button 
                type="submit"
                disabled={biddingBusy || !customBidAmount}
                className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black tracking-widest uppercase rounded-xl transition-all border-none shadow-md cursor-pointer disabled:opacity-40"
              >
                {biddingBusy ? 'Transmitting offer...' : 'Dispatch Quote Proposal'}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Pagination Segment Footer */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Showing <span className="font-mono text-slate-700 font-bold">{jobs.length}</span> of <span className="font-mono text-slate-700 font-bold">{pagination.total}</span> open entries
        </p>
        <div className="flex items-center gap-1.5">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-colors cursor-pointer bg-white ${canPrev ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}
            type="button"
            onClick={() => canPrev && setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={!canPrev}
          >
            <span className="material-symbols-outlined text-base font-bold">chevron_left</span>
          </button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-colors cursor-pointer bg-white ${canNext ? 'border-[#2F4DA0] text-[#2F4DA0] hover:bg-blue-50' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}
            type="button"
            onClick={() => canNext && setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={!canNext}
          >
            <span className="material-symbols-outlined text-base font-bold">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}