import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Avatar from '../../components/Avatar.tsx';
import Skeleton from '../../components/Skeleton.tsx';
import { useAuth } from '../../lib/auth-context.tsx';
import { apiRequest } from '../../lib/api.ts';
import { formatCoordinateText, reverseGeocodeLocation } from '../../lib/location.ts';

function formatCurrency(amount) {
  return `LKR ${Number(amount || 0).toLocaleString()}`;
}

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Date(value).toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortTime(value) {
  if (!value) return 'Pending';
  return new Date(value).toLocaleString('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatReviewDate(value) {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getReviewTone(rating) {
  const value = Number(rating || 0);
  if (value >= 4) {
    return {
      label: 'Positive',
      className: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    };
  }
  if (value >= 3) {
    return {
      label: 'Neutral',
      className: 'bg-amber-50 text-amber-600 border border-amber-100',
    };
  }
  return {
    label: 'Negative',
    className: 'bg-rose-50 text-rose-600 border border-rose-100',
  };
}

function getTimeline(job) {
  return [
    { key: 'posted', icon: 'check', label: 'Posted', done: Boolean(job?.createdAt), date: job?.createdAt },
    { key: 'accepted', icon: 'check', label: 'Accepted', done: Boolean(job?.acceptedAt), date: job?.acceptedAt },
    { key: 'arrived', icon: 'location_on', label: 'Arrived', done: Boolean(job?.arrivedAt), date: job?.arrivedAt },
    {
      key: 'completed',
      icon: 'inventory_2',
      label: 'Completed',
      done: Boolean(job?.completedAt || job?.status === 'completed' || job?.status === 'paid'),
      date: job?.completedAt || job?.paidAt,
    },
  ];
}

function findActiveStep(timeline) {
  const firstPendingIndex = timeline.findIndex((item) => !item.done);
  if (firstPendingIndex === -1) return timeline.length - 1;
  return Math.max(0, firstPendingIndex - 1);
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (!value) return 'Pending';
  if (value === 'paid') return 'Paid';
  if (value === 'ongoing') return 'In Progress';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildQrUrl(token) {
  if (!token) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(token)}`;
}

export default function ProviderJobDetailsPage() {
  const { accessToken } = useAuth();
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const [qrInfo, setQrInfo] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  async function loadJobDetails() {
    if (!headers || !jobId) return;

    const response = await apiRequest(`/jobs/${jobId}`, { headers });
    const nextJob = response?.data || null;
    setJob(nextJob);

    if (nextJob?.location) {
      const resolvedLocation = await reverseGeocodeLocation(nextJob.location).catch(() => null);
      setLocationInfo(resolvedLocation);
    } else {
      setLocationInfo(null);
    }

    return nextJob;
  }

  async function loadQr(nextJob) {
    if (!headers || !jobId) return;

    const currentJob = nextJob || job;
    const needsQr = currentJob?.status === 'accepted' && !currentJob?.arrivedAt;
    if (!needsQr) {
      setQrInfo(null);
      return;
    }

    const response = await apiRequest(`/providers/${jobId}/qr`, { headers });
    setQrInfo(response?.data || null);
  }

  async function loadReview() {
    if (!headers || !jobId) return;

    try {
      const response = await apiRequest(`/reviews/job/${jobId}`, { headers });
      setReview(response?.data || null);
    } catch (loadError) {
      if (String(loadError?.message || '').toLowerCase().includes('not allowed')) {
        throw loadError;
      }
      setReview(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!headers || !jobId) return;
      setLoading(true);
      setError('');
      try {
        const nextJob = await loadJobDetails();
        if (!mounted) return;
        await Promise.all([loadQr(nextJob), loadReview()]);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.message || 'Failed to load job details.');
        setJob(null);
        setQrInfo(null);
        setReview(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [headers, jobId]);

  const timeline = useMemo(() => getTimeline(job), [job]);
  const activeStepIndex = useMemo(() => findActiveStep(timeline), [timeline]);

  const customerName = job?.customerId?.name || 'Customer';
  const customerImage = job?.customerId?.profileImage || '';
  const customerLocation = [job?.customerId?.city, job?.customerId?.district].filter(Boolean).join(', ');
  const canStartJob = Boolean(job && job.status === 'arrived');
  const canConfirmCompletion = Boolean(job && (job.status === 'ongoing' || job.status === 'completed') && !job.providerCompletion);
  const canFinalize = Boolean(job?.providerCompletion && job?.customerCompletion && job?.status !== 'completed' && job?.status !== 'paid');
  const qrImageUrl = buildQrUrl(qrInfo?.token);

  async function refreshAll() {
    const nextJob = await loadJobDetails();
    await Promise.all([loadQr(nextJob), loadReview()]);
  }

  async function handleStartJob() {
    if (!canStartJob || !job?._id) return;
    try {
      setActionLoading('start');
      setError('');
      await apiRequest(`/jobs/${job._id}/start`, { method: 'PUT', headers });
      await refreshAll();
    } catch (actionError) {
      setError(actionError?.message || 'Failed to start job.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleConfirmCompletion() {
    if (!canConfirmCompletion || !job?._id) return;
    try {
      setActionLoading('complete');
      setError('');
      const response = await apiRequest(`/jobs/${job._id}/complete/provider`, {
        method: 'PUT',
        headers,
      });

      let nextJob = response?.data || job;
      if (nextJob?.providerCompletion && nextJob?.customerCompletion && nextJob?.status !== 'completed' && nextJob?.status !== 'paid') {
        const finalizeResponse = await apiRequest(`/jobs/${job._id}/complete/finalize`, {
          method: 'PUT',
          headers,
        });
        nextJob = finalizeResponse?.data || nextJob;
      }

      setJob(nextJob);
      await loadQr(nextJob);
    } catch (actionError) {
      setError(actionError?.message || 'Failed to update completion status.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleFinalize() {
    if (!canFinalize || !job?._id) return;
    try {
      setActionLoading('finalize');
      setError('');
      const response = await apiRequest(`/jobs/${job._id}/complete/finalize`, {
        method: 'PUT',
        headers,
      });
      const nextJob = response?.data || job;
      setJob(nextJob);
      await loadQr(nextJob);
    } catch (actionError) {
      setError(actionError?.message || 'Failed to finalize job.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleRefreshQr() {
    if (!job?._id || job.status !== 'accepted' || job.arrivedAt) return;
    try {
      setActionLoading('qr');
      setError('');
      await loadQr(job);
    } catch (actionError) {
      setError(actionError?.message || 'Failed to refresh QR code.');
    } finally {
      setActionLoading('');
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto space-y-8">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-12 w-36 rounded-xl" />
        </div>
        <div className="bg-white p-8 rounded-2xl border border-slate-100 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
          <div className="col-span-4 space-y-6">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto space-y-4">
        <p className="text-sm text-red-600">{error || 'Job not found'}</p>
        <Link className="text-sm font-semibold text-[#2F4DA0] hover:underline" to="/provider/my-jobs">
          Back to My Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link className="hover:text-slate-600" to="/provider/my-jobs">
          My Jobs
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="font-semibold text-slate-900">{job.title || 'Job Details'}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{job.title || 'Job Details'}</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">pin_drop</span>
            {locationInfo?.shortLabel || formatCoordinateText(job.location)}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Job Value</p>
            <p className="text-3xl font-bold text-[#2F4DA0]">{formatCurrency(job.price)}</p>
          </div>
          <Link
            className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all"
            to="/provider/my-jobs"
          >
            Back to My Jobs
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex justify-between">
          <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 z-0" />
          <div
            className="absolute top-5 left-0 h-1 bg-[#2F4DA0] z-0 transition-all"
            style={{ width: `${(activeStepIndex / (timeline.length - 1)) * 100}%` }}
          />

          {timeline.map((item, index) => {
            const isActive = index === activeStepIndex;
            return (
              <div key={item.key} className="relative z-10 flex flex-col items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${
                    item.done ? 'bg-emerald-500 text-white border-white' : ''
                  } ${
                    isActive && !item.done ? 'bg-[#2F4DA0] text-white border-white ring-4 ring-blue-50' : ''
                  } ${
                    !item.done && !isActive ? 'bg-white text-slate-300 border-slate-100' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </div>
                <div className="text-center">
                  <span
                    className={`block text-sm ${
                      isActive ? 'font-bold text-[#2F4DA0]' : item.done ? 'font-semibold text-slate-900' : 'font-semibold text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-1">{formatDateTime(item.date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-[#2F4DA0] text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                {normalizeStatus(job.status)}
              </span>
              <span className="bg-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                {job.category || 'General'}
              </span>
            </div>

            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2F4DA0]">description</span>
              Job Description
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>{job.description || 'No description provided.'}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Current Stage</p>
                <p className="text-slate-900 font-semibold">{normalizeStatus(job.status)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Accepted On</p>
                  <p className="text-slate-900 font-semibold">{formatDateTime(job.acceptedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2F4DA0]">map</span>
                Service Location
              </h2>
              {job.location?.coordinates?.length === 2 ? (
                <a
                  className="text-[#2F4DA0] font-semibold text-sm flex items-center gap-1 hover:underline"
                  href={`https://www.google.com/maps?q=${job.location.coordinates[1]},${job.location.coordinates[0]}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="material-symbols-outlined text-base">directions</span>
                  Open in Maps
                </a>
              ) : null}
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Address</p>
                <p className="text-sm font-semibold text-slate-900">{locationInfo?.label || formatCoordinateText(job.location)}</p>
                <p className="text-xs text-slate-400 mt-1">{formatCoordinateText(job.location)}</p>
              </div>
              <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shrink-0">
                <span className="material-symbols-outlined">location_on</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2F4DA0]">verified</span>
              Completion Confirmation
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 ${canConfirmCompletion ? 'bg-white border border-[#2F4DA0] shadow-sm' : 'bg-white border border-slate-100 shadow-sm'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${job.providerCompletion ? 'bg-emerald-50 text-emerald-600' : canConfirmCompletion ? 'bg-blue-50 text-[#2F4DA0]' : 'bg-slate-50 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-2xl">{job.providerCompletion ? 'task_alt' : 'construction'}</span>
                </div>
                <div>
                  <p className="font-bold">Your Completion Status</p>
                  <p className="text-sm text-slate-500">
                    {job.providerCompletion
                      ? 'You marked this job as completed.'
                      : canConfirmCompletion
                        ? 'Mark the job complete when the work is finished.'
                        : 'Start and finish the work before confirming completion.'}
                  </p>
                </div>
                <button
                  className={`px-6 py-2 text-sm font-bold rounded-xl ${
                    canConfirmCompletion ? 'bg-[#2F4DA0] text-white hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  } transition-all`}
                  disabled={!canConfirmCompletion || actionLoading === 'complete'}
                  onClick={handleConfirmCompletion}
                  type="button"
                >
                  {job.providerCompletion ? 'Confirmed' : actionLoading === 'complete' ? 'Saving...' : 'Mark Complete'}
                </button>
              </div>

              <div className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 ${job.customerCompletion ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border-2 border-dashed border-slate-200'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${job.customerCompletion ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-2xl">{job.customerCompletion ? 'check_circle' : 'hourglass_empty'}</span>
                </div>
                <div>
                  <p className="font-bold">Customer Confirmation</p>
                  <p className="text-sm text-slate-500">
                    {job.customerCompletion
                      ? 'Customer confirmed the work is complete.'
                      : 'Waiting for the customer to confirm after your completion update.'}
                  </p>
                </div>
                <button
                  className={`px-6 py-2 text-sm font-bold rounded-xl ${
                    canFinalize ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  } transition-all`}
                  disabled={!canFinalize || actionLoading === 'finalize'}
                  onClick={handleFinalize}
                  type="button"
                >
                  {job.status === 'completed' || job.status === 'paid'
                    ? 'Finalized'
                    : actionLoading === 'finalize'
                      ? 'Finalizing...'
                      : 'Finalize Job'}
                </button>
              </div>
            </div>
          </div>

          {review ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2F4DA0]">reviews</span>
                  Customer Review
                </h2>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${getReviewTone(review.rating).className}`}>
                  {getReviewTone(review.rating).label}
                </span>
              </div>

              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    className="w-11 h-11"
                    name={review?.customerId?.name || customerName}
                    src={review?.customerId?.profileImage || customerImage}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{review?.customerId?.name || customerName}</p>
                    <p className="text-xs text-slate-500">{formatReviewDate(review?.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <span key={`provider-job-review-${value}`} className="material-symbols-outlined text-lg">
                        {value <= Number(review?.rating || 0) ? 'star' : 'star_outline'}
                      </span>
                    ))}
                    <span className="ml-2 text-sm font-semibold text-slate-700">
                      {Number(review?.rating || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {review?.comment || 'Customer submitted a rating without a written review.'}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-[#2F4DA0] p-6 rounded-2xl text-white shadow-lg shadow-blue-200/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Customer Scan QR</h2>
              <div className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${job.arrivedAt ? 'bg-emerald-500 text-white' : 'bg-white/15 text-white'}`}>
                <span className="material-symbols-outlined text-[12px]">qr_code_scanner</span>
                {job.arrivedAt ? 'VERIFIED' : 'PENDING'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-4 min-h-72">
              {job.arrivedAt ? (
                <div className="text-center text-slate-900">
                  <div className="w-36 h-36 bg-slate-100 flex items-center justify-center relative mx-auto mb-3 rounded-lg">
                    <span className="material-symbols-outlined text-emerald-500 text-6xl">verified</span>
                  </div>
                  <p className="text-sm font-semibold">Arrival confirmed by customer</p>
                </div>
              ) : qrImageUrl ? (
                <div className="w-full text-center space-y-3">
                  <img alt="Customer scan QR" className="w-56 h-56 mx-auto rounded-xl border border-slate-100 bg-white p-3" src={qrImageUrl} />
                  <p className="text-sm font-semibold text-slate-900">Ask the customer to scan this QR when you arrive</p>
                </div>
              ) : (
                <div className="text-center text-slate-700">
                  <span className="material-symbols-outlined text-5xl text-[#2F4DA0]">qr_code_2</span>
                  <p className="mt-3 text-sm font-semibold">QR code will be available after acceptance and before arrival verification.</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                className={`w-full px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                  canStartJob
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-white/15 text-white hover:bg-white/20'
                } ${actionLoading && actionLoading !== 'start' ? 'opacity-80' : ''}`}
                disabled={actionLoading === 'start'}
                onClick={canStartJob ? handleStartJob : handleRefreshQr}
                type="button"
              >
                {canStartJob
                  ? actionLoading === 'start'
                    ? 'Starting...'
                    : 'Start Job'
                  : actionLoading === 'qr'
                    ? 'Refreshing QR...'
                    : 'Refresh QR'}
              </button>
              <p className="text-center text-xs text-blue-100 font-medium">
                {job.arrivedAt
                  ? `Customer verified your arrival at ${formatShortTime(job.arrivedAt)}.`
                  : qrInfo?.expiresAt
                    ? `QR expires at ${formatDateTime(qrInfo.expiresAt)}. Refreshing generates a new scan token.`
                    : 'The QR appears only while the job is waiting for arrival verification.'}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Customer Details</h2>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-14 h-14" name={customerName} src={customerImage} />
              <div>
                <p className="text-lg font-bold text-slate-900">{customerName}</p>
                <p className="text-sm text-slate-500">{customerLocation || 'Sri Lanka'}</p>
                {job?.customerId?.email ? <p className="text-xs text-slate-400 mt-1">{job.customerId.email}</p> : null}
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-50">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Job status:</span>
                <span className="font-semibold text-slate-900">{normalizeStatus(job.status)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Arrival check:</span>
                <span className={`font-semibold ${job.arrivedAt ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {job.arrivedAt ? 'Confirmed' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Completion check:</span>
                <span className={`font-semibold ${job.customerCompletion ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {job.customerCompletion ? 'Customer confirmed' : 'Awaiting customer'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Payout Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-500"><span>Service Value</span><span>{formatCurrency(job.price)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Platform Fee</span><span>LKR 0</span></div>
              <div className="flex justify-between text-slate-500 pb-3 border-b border-slate-50"><span>Materials</span><span>LKR 0</span></div>
              <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-50">
                <span>Total Amount</span>
                <span>{formatCurrency(job.price)}</span>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
              <p className="text-xs text-blue-700 leading-snug">
                The job is finalized only after both you and the customer confirm completion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

