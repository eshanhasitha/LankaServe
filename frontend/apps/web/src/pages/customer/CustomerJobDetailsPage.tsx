import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../../components/Avatar.tsx';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import { formatCoordinateText, reverseGeocodeLocation } from '../../lib/location.ts';
import Skeleton from '../../components/Skeleton.tsx';

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

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (!value) return 'Pending';
  if (value === 'paid') return 'Paid';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function StarRating({ value, onChange = undefined, readOnly = false, sizeClass = 'text-3xl' }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= Number(value || 0);
        const commonClass = `${sizeClass} leading-none ${filled ? 'text-amber-400' : 'text-slate-300'}`;

        if (readOnly) {
          return (
            <span key={`star-readonly-${starValue}`} className={commonClass}>
              â˜…
            </span>
          );
        }

        return (
          <button
            key={`star-input-${starValue}`}
            type="button"
            className={`${commonClass} cursor-pointer hover:scale-105 transition-transform`}
            onClick={() => onChange?.(starValue)}
            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            â˜…
          </button>
        );
      })}
    </div>
  );
}

function getTimeline(job) {
  return [
    {
      key: 'posted',
      icon: 'check',
      label: 'Posted',
      done: Boolean(job?.createdAt),
      date: job?.createdAt,
    },
    {
      key: 'accepted',
      icon: 'check',
      label: 'Accepted',
      done: Boolean(job?.acceptedAt),
      date: job?.acceptedAt,
    },
    {
      key: 'arrived',
      icon: 'location_on',
      label: 'Arrived',
      done: Boolean(job?.arrivedAt),
      date: job?.arrivedAt,
    },
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

function resolveProviderProfile(providers, providerId) {
  if (!providerId) return null;
  return providers.find((item) => String(item?.userId?._id || item?.userId) === String(providerId)) || null;
}

export default function CustomerJobDetailsPage() {
  const { jobId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [scanToken, setScanToken] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [locationInfo, setLocationInfo] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const headers = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  useEffect(() => {
    let mounted = true;

    async function loadDetails() {
      try {
        setLoading(true);
        setError('');

        const jobResponse = await apiRequest(`/jobs/${jobId}`, { headers });
        if (!mounted) return;

        const nextJob = jobResponse?.data || null;
        setJob(nextJob);
        if (nextJob?.location) {
          const resolvedLocation = await reverseGeocodeLocation(nextJob.location);
          if (mounted) setLocationInfo(resolvedLocation);
        } else if (mounted) {
          setLocationInfo(null);
        }

        if (nextJob?.providerId) {
          try {
            const [providersResponse, reviewResponse] = await Promise.all([
              apiRequest('/providers?limit=100', { headers }),
              ['completed', 'paid'].includes(String(nextJob?.status || '').toLowerCase())
                ? apiRequest(`/reviews/job/${nextJob._id}/mine`, { headers }).catch(() => ({ data: null }))
                : Promise.resolve({ data: null }),
            ]);
            if (!mounted) return;
            const providers = Array.isArray(providersResponse?.data) ? providersResponse.data : [];
            setProviderProfile(resolveProviderProfile(providers, nextJob.providerId));
            setReview(reviewResponse?.data || null);
          } catch {
            if (mounted) {
              setProviderProfile(null);
              setReview(null);
            }
          }
        } else {
          setProviderProfile(null);
          setReview(null);
        }
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError.message || 'Failed to load job details');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDetails();
    return () => {
      mounted = false;
    };
  }, [headers, jobId]);

  const timeline = useMemo(() => getTimeline(job), [job]);
  const activeStepIndex = useMemo(() => findActiveStep(timeline), [timeline]);

  const providerName = providerProfile?.userId?.name || (job?.providerId ? 'Assigned Provider' : 'Awaiting Provider');
  const providerImage = providerProfile?.userId?.profileImage || '';
  const providerCategories = Array.isArray(providerProfile?.categories) && providerProfile.categories.length
    ? providerProfile.categories.join(', ')
    : job?.category || 'General Service';
  const providerRating = providerProfile?.stats?.averageRating;
  const providerCompletedJobs = providerProfile?.stats?.completedJobs;
  const canConfirmCompletion = Boolean(
    job &&
    (job.status === 'ongoing' || job.status === 'completed') &&
    job.providerCompletion &&
    !job.customerCompletion
  );
  const needsArrivalVerification = Boolean(job && job.status === 'accepted' && !job.arrivedAt);
  const canReview = Boolean(
    job &&
    job.providerId &&
    ['completed', 'paid'].includes(String(job.status || '').toLowerCase()) &&
    job.customerCompletion &&
    !review
  );

  useEffect(() => {
    setScannerSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => () => {
    stopScanner();
  }, []);

  function stopScanner() {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  async function submitArrivalToken(token) {
    if (!job?._id || !token) return;

    try {
      setError('');
      setScannerMessage('');
      const response = await apiRequest(`/jobs/${job._id}/arrival/scan`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ token }),
      });
      setJob(response?.data || job);
      setScanToken('');
      setScannerOpen(false);
      stopScanner();
    } catch (scanError) {
      setScannerMessage(scanError.message || 'QR verification failed');
    }
  }

  async function startScanner() {
    if (!scannerSupported || scanning) return;

    try {
      setScannerMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const BarcodeDetectorApi = (window as any).BarcodeDetector;
      if (!BarcodeDetectorApi) {
        setScannerMessage('Barcode scanner is not supported in this browser');
        stopScanner();
        return;
      }
      const detector = new BarcodeDetectorApi({ formats: ['qr_code'] });
      setScanning(true);

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        if (video.readyState < 2) return;

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const codes = await detector.detect(canvas);
          const rawValue = codes?.[0]?.rawValue;
          if (rawValue) {
            stopScanner();
            setScanToken(rawValue);
            await submitArrivalToken(rawValue);
          }
        } catch {
          // Ignore transient detector failures while the camera is active.
        }
      }, 700);
    } catch (cameraError) {
      setScannerMessage(cameraError.message || 'Unable to open camera');
      stopScanner();
    }
  }

  async function handleConfirmCompletion() {
    if (!job?._id || !canConfirmCompletion) return;

    try {
      setConfirming(true);
      setError('');

      const confirmResponse = await apiRequest(`/jobs/${job._id}/complete/customer`, {
        method: 'PUT',
        headers,
      });

      let nextJob = confirmResponse?.data || job;

      if (nextJob?.providerCompletion && nextJob?.customerCompletion) {
        const finalizeResponse = await apiRequest(`/jobs/${job._id}/complete/finalize`, {
          method: 'PUT',
          headers,
        });
        nextJob = finalizeResponse?.data || nextJob;
      }

      setJob(nextJob);
      if (['completed', 'paid'].includes(String(nextJob?.status || '').toLowerCase())) {
        setReviewLoading(true);
        try {
          const reviewResponse = await apiRequest(`/reviews/job/${job._id}/mine`, { headers });
          setReview(reviewResponse?.data || null);
        } catch {
          setReview(null);
        } finally {
          setReviewLoading(false);
        }
      }
    } catch (confirmError) {
      setError(confirmError.message || 'Failed to confirm completion');
    } finally {
      setConfirming(false);
    }
  }

  function openScannerPanel() {
    setScannerOpen(true);
    setScannerMessage('');
    if (scannerSupported) {
      startScanner();
    }
  }

  function closeScannerPanel() {
    setScannerOpen(false);
    setScannerMessage('');
    stopScanner();
  }

  async function handleSubmitReview() {
    if (!canReview || reviewSubmitting) return;
    if (!reviewForm.rating) {
      setError('Please select a rating before submitting your review.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setError('');
      const response = await apiRequest('/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobId: job._id,
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim(),
        }),
      });
      setReview(response?.data || {
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      setReviewForm({ rating: 0, comment: '' });
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-1/3" />
        <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto space-y-4">
        <p className="text-sm text-red-600">{error || 'Job not found'}</p>
        <Link className="text-sm font-semibold text-[#2F4DA0] hover:underline" to="/customer/my-jobs">
          Back to My Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link className="hover:text-slate-600" to="/customer/my-jobs">
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
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Quote</p>
            <p className="text-3xl font-bold text-[#2F4DA0]">{formatCurrency(job.price)}</p>
          </div>
          <button
            className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            onClick={() => navigate('/customer/post-service', { state: { editJobId: job._id } })}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            Edit Details
          </button>
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
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2F4DA0]">description</span>
              Job Description
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>{job.description || 'No description provided.'}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Estimated Duration</p>
                  <p className="text-slate-900 font-semibold">
                    {job.status === 'pending' ? 'Awaiting acceptance' : job.status === 'accepted' ? 'Scheduled' : '4 - 6 Hours'}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Urgency</p>
                  <p className="text-slate-900 font-semibold">{job.price >= 20000 ? 'Standard' : 'Normal'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2F4DA0]">map</span>
                Location
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
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${job.providerCompletion ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                  <span className="material-symbols-outlined text-2xl">{job.providerCompletion ? 'check_circle' : 'hourglass_empty'}</span>
                </div>
                <div>
                  <p className="font-bold">Provider Status</p>
                  <p className="text-sm text-slate-500">
                    {job.providerCompletion ? 'Provider marked this job as completed.' : 'Awaiting provider completion confirmation.'}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${job.providerCompletion ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                  {job.providerCompletion ? 'CONFIRMED' : 'PENDING'}
                </span>
              </div>

              <div className={`p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 ${canConfirmCompletion ? 'bg-white border border-[#2F4DA0] shadow-sm' : 'bg-white border-2 border-dashed border-slate-200'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${job.customerCompletion ? 'bg-emerald-50 text-emerald-600' : canConfirmCompletion ? 'bg-blue-50 text-[#2F4DA0]' : 'bg-slate-50 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-2xl">{job.customerCompletion ? 'task_alt' : 'touch_app'}</span>
                </div>
                <div>
                  <p className="font-bold">Your Confirmation</p>
                  <p className="text-sm text-slate-500">
                    {job.customerCompletion
                      ? 'You have confirmed this job as complete.'
                      : canConfirmCompletion
                        ? 'Provider finished the work. Confirm to finalize.'
                        : 'Wait for the provider to mark the job complete.'}
                  </p>
                </div>
                <button
                  className={`px-6 py-2 text-sm font-bold rounded-xl ${
                    canConfirmCompletion
                      ? 'bg-[#2F4DA0] text-white hover:opacity-90'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  } transition-all`}
                  disabled={!canConfirmCompletion || confirming}
                  onClick={handleConfirmCompletion}
                  type="button"
                >
                  {job.customerCompletion ? 'Confirmed' : confirming ? 'Confirming...' : 'Confirm Done'}
                </button>
              </div>
            </div>
          </div>

          {['completed', 'paid'].includes(String(job.status || '').toLowerCase()) ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2F4DA0]">rate_review</span>
                    Rate & Review
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Share your experience with {providerName}.
                  </p>
                </div>
              </div>

              {reviewLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-10 w-52" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
              ) : review ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    <StarRating readOnly sizeClass="text-xl" value={review.rating} />
                    <span className="ml-2 text-sm font-semibold text-slate-700">{Number(review.rating || 0).toFixed(1)}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {review.comment || 'You submitted a rating without a written review.'}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-emerald-600">Your review has been submitted.</p>
                </div>
              ) : canReview ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Your Rating</p>
                    <StarRating
                      value={reviewForm.rating}
                      onChange={(value) => setReviewForm((prev) => ({ ...prev, rating: value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2" htmlFor="customer-review-comment">
                      Review
                    </label>
                    <textarea
                      id="customer-review-comment"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none focus:border-[#2F4DA0] focus:ring-[#2F4DA0]"
                      rows={4}
                      placeholder="Write a short review about the provider's work quality, communication, and punctuality."
                      value={reviewForm.comment}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                    />
                  </div>
                  <button
                    className="px-6 py-2.5 rounded-xl bg-[#2F4DA0] text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60"
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                  Review will be available after the provider completes the job and you confirm completion.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="col-span-4 space-y-6">
          <div className="bg-[#2F4DA0] p-6 rounded-2xl text-white shadow-lg shadow-blue-200/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Arrival Confirmed</h2>
              <div className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${job.arrivedAt ? 'bg-emerald-500 text-white' : 'bg-white/15 text-white'}`}>
                <span className="material-symbols-outlined text-[12px]">verified</span>
                {job.arrivedAt ? 'VERIFIED' : 'PENDING'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-4 min-h-52">
              {job.arrivedAt ? (
                <div className="text-center text-slate-900">
                  <div className="w-32 h-32 bg-slate-100 flex items-center justify-center relative mx-auto mb-3 rounded-lg">
                    <span className="material-symbols-outlined text-emerald-500 text-6xl">qr_code_2</span>
                  </div>
                  <p className="text-sm font-semibold">Arrival verification complete</p>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <div className="text-center text-slate-700">
                    <span className="material-symbols-outlined text-5xl text-[#2F4DA0]">qr_code_scanner</span>
                    <p className="mt-3 text-sm font-semibold">Scan provider QR to confirm arrival</p>
                  </div>
                  <button
                    className={`w-full px-5 py-3 rounded-xl text-sm font-bold transition-all ${needsArrivalVerification ? 'bg-[#2F4DA0] text-white hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    disabled={!needsArrivalVerification}
                    onClick={openScannerPanel}
                    type="button"
                  >
                    Scan Provider QR
                  </button>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]"
                    onChange={(event) => setScanToken(event.target.value)}
                    placeholder="Paste provider QR token"
                    type="text"
                    value={scanToken}
                  />
                  <button
                    className="w-full px-5 py-3 rounded-xl text-sm font-bold bg-white border border-[#2F4DA0] text-[#2F4DA0] hover:bg-blue-50 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
                    disabled={!needsArrivalVerification || !scanToken.trim()}
                    onClick={() => submitArrivalToken(scanToken.trim())}
                    type="button"
                  >
                    Verify Arrival
                  </button>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-blue-100 font-medium">
              {job.arrivedAt ? `Provider scanned at ${formatShortTime(job.arrivedAt)} today` : 'Customer must scan the provider QR on arrival.'}
            </p>
            {scannerMessage ? <p className="text-xs text-red-200 mt-3 text-center">{scannerMessage}</p> : null}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Assigned Provider</h2>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-14 h-14" name={providerName} src={providerImage} />
              <div>
                <p className="text-lg font-bold text-slate-900">{providerName}</p>
                <p className="text-sm text-slate-500">{providerCategories}</p>
                {providerRating ? (
                  <div className="flex items-center gap-1 text-orange-500 text-sm font-bold mt-1">
                    <span className="material-symbols-outlined text-sm">star</span>
                    {Number(providerRating).toFixed(1)}
                    {providerCompletedJobs ? (
                      <span className="text-slate-400 font-normal ml-1">({providerCompletedJobs} jobs)</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-50">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Availability:</span>
                <span className={`font-semibold ${providerProfile?.availability === 'online' ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {providerProfile?.availability || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Verification:</span>
                <span className={`font-semibold ${providerProfile?.verified ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {providerProfile?.verified ? 'Verified' : 'Pending'}
                </span>
              </div>
              {job.providerId ? (
                <Link
                  className="block text-center py-2 text-[#2F4DA0] font-bold text-sm hover:bg-blue-50 rounded-lg transition-all border border-blue-100 mt-2"
                  to={`/customer/find-providers/${job.providerId}`}
                  state={{ providerName }}
                >
                  View Profile
                </Link>
              ) : null}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Payment Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-500"><span>Labor Cost</span><span>{formatCurrency(job.price)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Materials (Est.)</span><span>LKR 0</span></div>
              <div className="flex justify-between text-slate-500 pb-3 border-b border-slate-50"><span>Service Fee</span><span>LKR 0</span></div>
              <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-50">
                <span>Total Amount</span>
                <span>{formatCurrency(job.price)}</span>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
              <p className="text-xs text-blue-700 leading-snug">
                Payment details from the backend currently expose the total amount only. Final payout happens after completion confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {scannerOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Scan Provider QR</h3>
                <p className="text-sm text-slate-500 mt-1">Point the camera at the provider&apos;s QR code to confirm arrival.</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={closeScannerPanel} type="button">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {scannerSupported ? (
                <>
                  <div className="bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                    <video ref={videoRef} autoPlay className="w-full h-full object-cover" muted playsInline />
                  </div>
                  <p className="text-sm text-slate-500">
                    {scanning ? 'Scanning camera feed for a QR code.' : 'Camera is preparing. If this stalls, close and reopen the scanner.'}
                  </p>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                  This browser does not support in-app QR detection. Use the manual token field below.
                </div>
              )}

              <div className="flex gap-3">
                <input
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]"
                  onChange={(event) => setScanToken(event.target.value)}
                  placeholder="Paste QR token manually"
                  type="text"
                  value={scanToken}
                />
                <button
                  className="px-5 py-3 rounded-xl text-sm font-bold bg-[#2F4DA0] text-white hover:opacity-90 transition-all disabled:bg-slate-200 disabled:text-slate-400"
                  disabled={!scanToken.trim()}
                  onClick={() => submitArrivalToken(scanToken.trim())}
                  type="button"
                >
                  Verify
                </button>
              </div>

              {scannerMessage ? <p className="text-sm text-red-600">{scannerMessage}</p> : null}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : null}
    </div>
  );
}

