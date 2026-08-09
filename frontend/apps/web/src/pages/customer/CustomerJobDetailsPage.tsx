import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../../components/Avatar.tsx';
import JobImageGallery from '../../components/JobImageGallery.tsx';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { formatCoordinateText, reverseGeocodeLocation } from '../../lib/location.ts';
import Skeleton from '../../components/Skeleton.tsx';

function formatCurrency(amount: any) {
  return `LKR ${Number(amount || 0).toLocaleString()}`;
}

function formatDateTime(value: any) {
  if (!value) return 'Pending Allocation';
  return new Date(value).toLocaleString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function StarRating({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            className={`text-xl border-none bg-transparent p-0 outline-none select-none ${filled ? 'text-amber-400' : 'text-slate-200'} ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function getTimeline(job: any) {
  return [
    { key: 'posted', icon: 'check', label: 'Posted', done: Boolean(job?.createdAt), date: job?.createdAt },
    { key: 'accepted', icon: 'handshake', label: 'Accepted', done: Boolean(job?.acceptedAt), date: job?.acceptedAt },
    { key: 'arrived', icon: 'location_on', label: 'Arrived', done: Boolean(job?.arrivedAt), date: job?.arrivedAt },
    { key: 'completed', icon: 'task_alt', label: 'Completed', done: Boolean(job?.completedAt || job?.status === 'completed' || job?.status === 'paid'), date: job?.completedAt || job?.paidAt },
  ];
}

export default function CustomerJobDetailsPage() {
  const { jobId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<any>(null);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [scanToken, setScanToken] = useState('');
  
  const [error, setError] = useState('');
  const [locationInfo, setLocationInfo] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ⚡ Local scan simulator state mocks
  const [simulatingScanner, setSimulatingScanner] = useState(false);

  const headers = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined), [accessToken]);

  useEffect(() => {
    let mounted = true;
    async function loadDetails() {
      try {
        setLoading(true);
        setError('');
        const response = await apiRequest(`/jobs/${jobId}`, { headers });
        if (!mounted || !response?.data) return;

        const nextJob = response.data;
        setJob(nextJob);

        if (nextJob.location) {
          const resLoc = await reverseGeocodeLocation(nextJob.location);
          if (mounted) setLocationInfo(resLoc);
        }

        if (nextJob.providerId) {
          const provId = nextJob.providerId._id || nextJob.providerId;
          const pResponse = await apiRequest('/providers?limit=100', { headers });
          const items = Array.isArray(pResponse?.data) ? pResponse.data : [];
          const match = items.find((p: any) => String(p._id) === String(provId) || String(p.userId?._id) === String(provId));
          if (mounted) setProviderProfile(match || null);

          if (['completed', 'paid'].includes(String(nextJob.status).toLowerCase())) {
            const revRes = await apiRequest(`/reviews/job/${nextJob._id}/mine`, { headers }).catch(() => ({ data: null }));
            if (mounted) setReview(revRes?.data || null);
          }
        }
      } catch (err: any) {
        if (mounted) setError('Failed to synchronize task details.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDetails();
    return () => { mounted = false; };
  }, [headers, jobId]);

  const timeline = useMemo(() => getTimeline(job), [job]);
  const activeStepIndex = useMemo(() => {
    const idx = timeline.findIndex((t) => !t.done);
    return idx === -1 ? timeline.length - 1 : Math.max(0, idx - 1);
  }, [timeline]);

  const providerName = job?.providerId?.name || providerProfile?.userId?.name || 'Assigned Provider';
  const providerImage = job?.providerId?.profileImage || providerProfile?.userId?.profileImage || '';
  const providerTrade = job?.category || 'General Service';

  const needsArrivalVerification = Boolean(job && job.status === 'accepted' && !job.arrivedAt);
  const canConfirmCompletion = Boolean(job && (job.status === 'ongoing' || job.status === 'completed') && job.providerCompletion && !job.customerCompletion);
  const canReview = Boolean(job && job.providerId && ['completed', 'paid'].includes(String(job.status).toLowerCase()) && job.customerCompletion && !review);

  // 🛡️ Safe simulator execution sequence to test QR verification pipelines instantly
  async function simulateScannerMockTrigger() {
    if (simulatingScanner) return;
    setSimulatingScanner(true);
    setError('');
    
    setTimeout(async () => {
      try {
        const mockToken = `mock-arrival-token-${Date.now()}`;
        const response = await apiRequest(`/jobs/${job._id}/arrival/scan`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ token: mockToken }),
        });
        if (response?.data) setJob(response.data);
      } catch (err: any) {
        setError(err.message || 'QR verification node mismatch.');
      } finally {
        setSimulatingScanner(false);
      }
    }, 1500);
  }

  async function handleConfirmCompletion() {
    if (!job?._id || !canConfirmCompletion || confirming) return;
    setConfirming(true);
    try {
      let confirmRes = await apiRequest(`/jobs/${job._id}/complete/customer`, { method: 'PUT', headers });
      let updatedJob = confirmRes?.data || job;

      if (updatedJob.providerCompletion && updatedJob.customerCompletion) {
        const finalizeRes = await apiRequest(`/jobs/${job._id}/complete/finalize`, { method: 'PUT', headers });
        updatedJob = finalizeRes?.data || updatedJob;
      }
      setJob(updatedJob);
    } catch (err: any) {
      setError('Completion clearing timeout error.');
    } finally {
      setConfirming(false);
    }
  }

  async function handleSubmitReview() {
    if (!canReview || !reviewForm.rating) return;
    setReviewSubmitting(true);
    try {
      const res = await apiRequest('/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId: job._id, rating: reviewForm.rating, comment: reviewForm.comment.trim() }),
      });
      setReview(res?.data || { rating: reviewForm.rating, comment: reviewForm.comment.trim() });
    } catch {
      setError('Review compilation database upload fault.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-6 w-1/4" /><Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 font-['Inter']">
      
      {/* Dynamic Breadcrumbs row node item */}
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
        <Link className="hover:text-slate-600 transition-colors" to="/customer/dashboard">Hub</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <Link className="hover:text-slate-600 transition-colors" to="/customer/my-jobs">My Jobs</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-slate-800 truncate">{job.title}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-[10px] font-black tracking-wider uppercase text-[#2F4DA0] rounded-md">{job.category}</span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">{job.title}</h1>
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mt-1">
            <span className="material-symbols-outlined text-base">pin_drop</span> {locationInfo?.label || formatCoordinateText(job.location)}
          </p>
        </div>

        <div className="flex items-center gap-6 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 md:px-6">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escrow Quote</p>
            <p className="text-2xl font-black text-[#2F4DA0] tracking-tight mt-0.5">{formatCurrency(job.price)}</p>
          </div>
          <button type="button" onClick={() => navigate('/customer/post-service', { state: { editJobId: job._id } })} className="h-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-4 rounded-xl text-xs transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-base">edit</span> Edit Request
          </button>
        </div>
      </div>

      {/* Progressive Step Node Path Bar */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-2xs">
        <div className="relative flex justify-between items-start gap-4">
          <div className="absolute top-4 left-0 right-0 h-1 bg-slate-100 z-0" />
          <div className="absolute top-4 left-0 h-1 bg-[#2F4DA0] z-0 transition-all duration-500" style={{ width: `${(activeStepIndex / (timeline.length - 1)) * 100}%` }} />
          
          {timeline.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center flex-1 text-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-4 font-bold transition-all ${step.done ? 'bg-emerald-500 text-white border-white shadow-3xs' : isActive ? 'bg-[#2F4DA0] text-white border-white ring-4 ring-blue-50' : 'bg-white text-slate-300 border-slate-100'}`}>
                  <span className="material-symbols-outlined text-sm font-bold">{step.icon}</span>
                </div>
                <span className={`text-xs mt-2 block ${isActive ? 'font-black text-[#2F4DA0]' : 'font-bold text-slate-500'}`}>{step.label}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 font-mono">{step.date ? new Date(step.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Allocation Blocks split layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2F4DA0] font-bold">description</span> Problem Assessment Description
            </h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
              {job.description || 'No descriptive criteria provided.'}
            </p>
            <JobImageGallery images={job.images} />
          </div>

          {/* Dual Multi-Approval Dual Capsular status tracker layout blocks */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2F4DA0] font-bold">verified_user</span> Milestone Approvals Trace
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between items-center text-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${job.providerCompletion ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                  <span className="material-symbols-outlined text-lg font-bold">{job.providerCompletion ? 'check_circle' : 'hourglass_top'}</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Technician Sign-off</h4>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-normal">Provider task closure submission state.</p>
                </div>
                <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-md ${job.providerCompletion ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                  {job.providerCompletion ? 'CLEARED' : 'PENDING'}
                </span>
              </div>

              <div className={`p-4 rounded-xl border flex flex-col justify-between items-center text-center gap-3 transition-colors ${canConfirmCompletion ? 'border-[#2F4DA0] bg-blue-50/20' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${job.customerCompletion ? 'bg-emerald-50 text-emerald-600' : canConfirmCompletion ? 'bg-blue-50 text-[#2F4DA0] animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-lg font-bold">{job.customerCompletion ? 'task_alt' : 'lock_open'}</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Your Safe Release</h4>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-normal">Unlock secure payment vault funds onto provider token node wallet.</p>
                </div>
                <button type="button" disabled={!canConfirmCompletion || confirming} onClick={handleConfirmCompletion} className={`h-8 px-4 rounded-lg text-xs font-black tracking-wide uppercase transition-all border-none ${canConfirmCompletion ? 'bg-[#2F4DA0] text-white shadow-xs hover:bg-blue-800 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  {job.customerCompletion ? 'Released' : confirming ? 'Clearing...' : 'Confirm Done'}
                </button>
              </div>
            </div>
          </div>

          {/* Reviews system card overlay block container */}
          {['completed', 'paid'].includes(String(job.status).toLowerCase()) && (
            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2F4DA0] font-bold">rate_review</span> Feedback Ledger
              </h3>

              {review ? (
                <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <StarRating readOnly value={review.rating} />
                  <p className="text-xs font-medium text-slate-600 leading-relaxed italic">"{review.comment || 'Rating applied without text block feedback context.'}"</p>
                </div>
              ) : canReview ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-500 block mb-1.5">Assign Star Metric Rating</span>
                    <StarRating value={reviewForm.rating} onChange={(val) => setReviewForm(p => ({ ...p, rating: val }))} />
                  </div>
                  <textarea className="w-full p-3 text-xs font-medium text-slate-800 border border-slate-200 rounded-xl h-24 focus:border-[#2F4DA0] outline-none" placeholder="Share notes regarding precision, trade handling, and timeliness..." value={reviewForm.comment} onChange={(e) => setReviewForm(p => ({ ...p, comment: e.target.value }))} />
                  <button type="button" disabled={reviewSubmitting || !reviewForm.rating} onClick={handleSubmitReview} className="h-9 px-4 bg-[#2F4DA0] hover:bg-blue-800 text-white text-xs font-bold rounded-lg uppercase tracking-wider border-none shadow-xs cursor-pointer">Submit Review</button>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-xs font-medium text-slate-400 italic text-center">Feedback channel opens upon completing dual confirmation loops.</div>
              )}
            </div>
          )}
        </div>

        {/* SIDEBAR NODES TRAY SELECTIONS LINK PILLS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* QR Verification Hub Sandbox card layout */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border border-slate-950">
            <div className="flex justify-between items-center mb-5">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">QR Checkpoint</h4>
              <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded ${job.arrivedAt ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-white/80'}`}>
                {job.arrivedAt ? 'VERIFIED' : 'PENDING'}
              </span>
            </div>

            <div className="bg-white rounded-xl p-5 text-slate-900 flex flex-col items-center justify-center min-h-[190px]">
              {job.arrivedAt ? (
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                    <span className="material-symbols-outlined text-4xl font-bold">verified</span>
                  </div>
                  <p className="text-xs font-black text-slate-800 leading-tight">Arrival Authenticated</p>
                  <p className="text-[10px] font-mono font-bold text-slate-400 tracking-tight">Geofencing location logged</p>
                </div>
              ) : (
                <div className="w-full text-center space-y-4">
                  <div className="text-slate-500">
                    <span className="material-symbols-outlined text-4xl text-[#2F4DA0] animate-pulse">qr_code_scanner</span>
                    <p className="text-xs font-black text-slate-800 mt-1">Verify Arrival On-Site</p>
                    <p className="text-[10px] text-slate-400 font-semibold leading-normal mt-1 px-2">Provider must display their token QR. Click below to simulate app scanner verification.</p>
                  </div>

                  <button
                    type="button"
                    disabled={!needsArrivalVerification || simulatingScanner}
                    onClick={simulateScannerMockTrigger}
                    className="w-full py-2.5 bg-[#2F4DA0] hover:bg-blue-800 text-white text-[10px] font-black tracking-widest uppercase rounded-xl transition-all border-none active:scale-98 shadow-md shadow-blue-900/10 disabled:opacity-40 cursor-pointer"
                  >
                    {simulatingScanner ? 'Syncing Nodes...' : 'Launch Simulator Scan'}
                  </button>
                </div>
              )}
            </div>

            {error && <p className="text-[10px] font-bold text-red-400 text-center mt-3 leading-normal">{error}</p>}
          </div>

          {/* Assigned Provider Metadata card block wrapper */}
          {job.providerId && (
            <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-2xs space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Assigned Specialist</span>
              
              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11 rounded-full border border-slate-100" name={providerName} src={providerImage} />
                <div className="min-w-0">
                  <h4 className="font-black text-slate-900 text-sm truncate">{providerName}</h4>
                  <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{providerTrade}</p>
                </div>
              </div>

              {providerProfile?.userId?._id && (
                <Link to={`/customer/providers/${providerProfile.userId._id}`} className="block w-full border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs tracking-wide py-2 rounded-xl text-center transition-colors">
                  View Profile Portfolio
                </Link>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}