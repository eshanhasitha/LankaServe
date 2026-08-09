import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth-context.tsx';
import { uploadSupportAttachmentImage } from '../lib/profile-image-client.ts';

const supportCategories = [
  'Payment Issue',
  'Technical Problem',
  'Account Access',
  'Verification Help',
  'Job Issue',
  'Other',
];

const statusClasses = {
  open: 'bg-blue-50 text-blue-600',
  in_progress: 'bg-amber-50 text-amber-600',
  resolved: 'bg-emerald-50 text-emerald-600',
  closed: 'bg-slate-100 text-slate-500',
};

function formatRelativeTime(value) {
  if (!value) return 'Updated recently';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'Updated just now';
  if (diffMinutes < 60) return `Updated ${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function getTicketTime(ticket) {
  if ((ticket.status === 'resolved' || ticket.status === 'closed') && ticket.closedAt) {
    return `Closed on ${new Date(ticket.closedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  return formatRelativeTime(ticket.updatedAt || ticket.createdAt);
}

export default function SupportRequestSection() {
  const { accessToken } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [form, setForm] = useState({ category: '', message: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  async function loadTickets() {
    try {
      setLoadingTickets(true);
      const response = await apiRequest('/support-requests/my?limit=5', { notifyOnError: false });
      setTickets(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleAttachmentFiles(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    setFormError('');
    setFormSuccess('');

    if (!selectedFiles.length) return;

    const remainingSlots = 5 - attachments.length;
    if (remainingSlots <= 0) {
      setFormError('You can attach up to 5 images.');
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      setFormError(`Only ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'} can be attached.`);
    }

    try {
      setUploadingAttachments(true);
      const uploaded = [];

      for (const file of filesToUpload as File[]) {
        const url = await uploadSupportAttachmentImage(file, accessToken);
        uploaded.push({
          url,
          name: file.name,
          type: file.type,
        });
      }

      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      setFormError(error.message || 'Attachment upload failed.');
    } finally {
      setUploadingAttachments(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.category) {
      setFormError('Select a support category.');
      return;
    }

    if (form.message.trim().length < 10) {
      setFormError('Enter at least 10 characters so support can understand the issue.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiRequest('/support-requests', {
        method: 'POST',
        body: JSON.stringify({
          category: form.category,
          subject: form.category,
          message: form.message.trim(),
          attachments,
        }),
      });

      const nextTicket = response?.data;
      if (nextTicket) {
        setTickets((prev) => [nextTicket, ...prev].slice(0, 5));
      } else {
        await loadTickets();
      }
      setForm({ category: '', message: '' });
      setAttachments([]);
      setFormSuccess('Support request submitted.');
    } catch (error) {
      setFormError(error.message || 'Could not submit support request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-lg font-bold mb-6">Contact Support</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Subject</label>
            <select
              className="w-full rounded-xl border-slate-200 focus:border-[#2F4DA0] focus:ring-[#2F4DA0] text-sm transition-all"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="">Select a category</option>
              {supportCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Message</label>
            <textarea
              className="w-full rounded-xl border-slate-200 focus:border-[#2F4DA0] focus:ring-[#2F4DA0] text-sm transition-all"
              placeholder="Describe your issue in detail..."
              rows={5}
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Attachments</label>
            <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-white hover:border-[#2F4DA0] transition-all cursor-pointer">
              <input
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                disabled={uploadingAttachments || attachments.length >= 5}
                multiple
                type="file"
                onChange={handleAttachmentFiles}
              />
              <span className="material-symbols-outlined text-slate-400">cloud_upload</span>
              <span className="text-sm text-slate-500 font-medium">
                {uploadingAttachments
                  ? 'Uploading attachments...'
                  : attachments.length >= 5
                    ? 'Maximum 5 images attached'
                    : 'Click or drag images to upload'}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                JPG, PNG or WEBP. Up to 5 images, max 5MB each
              </span>
            </label>

            {attachments.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attachments.map((attachment, index) => (
                  <div key={`${attachment.url}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img alt={attachment.name || `Attachment ${index + 1}`} className="h-28 w-full object-cover" src={attachment.url} />
                    <button
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm hover:text-red-600"
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                    <p className="truncate px-2 py-1.5 text-[11px] font-medium text-slate-500">{attachment.name || 'Uploaded image'}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {formError ? <p className="text-sm font-semibold text-red-600">{formError}</p> : null}
          {formSuccess ? <p className="text-sm font-semibold text-emerald-600">{formSuccess}</p> : null}

          <div className="pt-2">
            <button
              className="w-full md:w-auto px-10 py-3 rounded-xl bg-[#2F4DA0] text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting || uploadingAttachments}
              type="submit"
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </section>

      <section className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
          <header className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold">My Support Requests</h2>
          </header>
          <div className="p-6 space-y-4">
            {loadingTickets ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                Loading support requests...
              </p>
            ) : null}

            {!loadingTickets && tickets.length === 0 ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                No support requests submitted yet.
              </p>
            ) : null}

            {!loadingTickets && tickets.map((item) => (
              <article
                key={item.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400 group-hover:text-[#2F4DA0]">
                    #{item.ticketNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClasses[item.status] || statusClasses.open}`}>
                    {item.statusLabel || 'Open'}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-800 text-sm mb-1">{item.subject || item.category}</h4>
                <p className="text-xs text-slate-500 truncate">{item.message}</p>
                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  {getTicketTime(item)}
                </p>
              </article>
            ))}

            <button
              className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-[#2F4DA0] transition-colors border-t border-slate-50 mt-4"
              type="button"
              onClick={loadTickets}
            >
              Refresh requests
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
