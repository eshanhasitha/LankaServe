import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth-context.tsx';

const statuses = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const priorities = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusClass = {
  open: 'bg-blue-50 text-blue-600 border-blue-100',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-100',
  resolved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

const priorityClass = {
  low: 'bg-slate-100 text-slate-500',
  normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-50 text-orange-600',
  urgent: 'bg-red-50 text-red-600',
};

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function ticketSubtitle(ticket) {
  const bits = [ticket.ticketNumber, ticket.role, ticket.category].filter(Boolean);
  return bits.join(' • ');
}

export default function AdminSupportRequestsPage() {
  const { admin, authorizedRequest } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(searchParams.get('ticket') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeTicket = useMemo(
    () => tickets.find((ticket) => String(ticket.id) === String(activeTicketId)) || tickets[0] || null,
    [activeTicketId, tickets],
  );

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoadingTickets(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '1', limit: '80' });
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (query.trim()) params.set('search', query.trim());
      const response = await authorizedRequest(`/admin/support-requests?${params.toString()}`);
      const items = Array.isArray(response?.data) ? response.data : [];
      setTickets(items);
      setActiveTicketId((prev) => {
        if (prev && items.some((ticket) => String(ticket.id) === String(prev))) return prev;
        const routeTicketId = searchParams.get('ticket');
        if (routeTicketId && items.some((ticket) => String(ticket.id) === String(routeTicketId))) return routeTicketId;
        return items[0]?.id || '';
      });
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load support requests');
      setTickets([]);
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  }, [authorizedRequest, priorityFilter, query, searchParams, statusFilter]);

  const loadMessages = useCallback(async () => {
    if (!activeTicket?.userId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const response = await authorizedRequest(`/admin/support-chats/thread/${activeTicket.userId}?limit=100`);
      setMessages(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeTicket?.userId, authorizedRequest]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!activeTicketId) return;
    if (searchParams.get('ticket') === String(activeTicketId)) return;
    const next = new URLSearchParams(searchParams);
    next.set('ticket', activeTicketId);
    setSearchParams(next, { replace: true });
  }, [activeTicketId, searchParams, setSearchParams]);

  async function updateTicket(nextUpdates) {
    if (!activeTicket?.id) return;
    setSaving(true);
    setError('');
    try {
      const response = await authorizedRequest(`/admin/support-requests/${activeTicket.id}`, {
        method: 'PUT',
        body: JSON.stringify(nextUpdates),
      });
      const updated = response?.data;
      if (updated) {
        setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      } else {
        await loadTickets(true);
      }
    } catch (updateError) {
      setError(updateError?.message || 'Failed to update support request');
    } finally {
      setSaving(false);
    }
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !activeTicket?.userId) return;

    setSaving(true);
    try {
      const response = await authorizedRequest('/admin/support-chats/send', {
        method: 'POST',
        body: JSON.stringify({ userId: activeTicket.userId, content: text }),
      });
      const message = response?.data;
      if (message) setMessages((prev) => [...prev, message]);
      setReply('');
      if (activeTicket.status === 'open') await updateTicket({ status: 'in_progress' });
    } catch (sendError) {
      setError(sendError?.message || 'Failed to send support reply');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Receive customer and provider support tickets, assign status, and reply from one admin thread.</p>
        </div>
        <button
          type="button"
          onClick={() => loadTickets()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh
        </button>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_1fr]">
        <aside className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input
                className="w-full rounded-xl border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-(--primary)"
                placeholder="Search tickets, subject, message..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && loadTickets()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <select
                className="rounded-xl border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                {priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          </div>

          <div className="max-h-[calc(100vh-310px)] overflow-y-auto p-3 space-y-3">
            {loadingTickets ? <p className="p-4 text-sm text-slate-500">Loading support requests...</p> : null}
            {!loadingTickets && !tickets.length ? <p className="p-4 text-sm text-slate-500">No support requests found.</p> : null}
            {tickets.map((ticket) => {
              const active = String(ticket.id) === String(activeTicket?.id);
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setActiveTicketId(ticket.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-(--primary) bg-blue-50/50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">#{ticket.ticketNumber}</p>
                      <h2 className="mt-1 truncate text-sm font-bold text-slate-900">{ticket.subject || ticket.category}</h2>
                      <p className="mt-1 truncate text-xs text-slate-500">{ticket.userName || 'Unknown user'} • {ticket.role}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass[ticket.status] || statusClass.open}`}>
                      {ticket.statusLabel || ticket.status}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{ticket.message}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${priorityClass[ticket.priority] || priorityClass.normal}`}>
                      {ticket.priority || 'normal'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">{formatTime(ticket.updatedAt || ticket.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-h-[620px] rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {activeTicket ? (
            <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_360px]">
              <div className="flex min-h-[620px] flex-col border-r border-slate-100">
                <header className="border-b border-slate-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{ticketSubtitle(activeTicket)}</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">{activeTicket.subject || activeTicket.category}</h2>
                      <p className="mt-1 text-sm text-slate-500">{activeTicket.userName || 'Unknown user'} • {activeTicket.userEmail || 'No email'}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusClass[activeTicket.status] || statusClass.open}`}>
                      {activeTicket.statusLabel || activeTicket.status}
                    </span>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-slate-50/60 p-5 space-y-4">
                  <article className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Original Request</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeTicket.message}</p>
                    {activeTicket.attachments?.length ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                        {activeTicket.attachments.map((item, index) => (
                          <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            <img src={item.url} alt={item.name || `Attachment ${index + 1}`} className="h-28 w-full object-cover" />
                            <p className="truncate px-2 py-1.5 text-[11px] text-slate-500">{item.name || 'Attachment'}</p>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </article>

                  {loadingMessages ? <p className="text-sm text-slate-500">Loading conversation...</p> : null}
                  {!loadingMessages && !messages.length ? <p className="text-sm text-slate-500">No support chat messages yet.</p> : null}
                  {messages.map((message) => {
                    const fromAdmin = String(message.senderId) === String(admin?._id);
                    return (
                      <div key={message._id || `${message.createdAt}-${message.content}`} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${fromAdmin ? 'bg-(--primary) text-white' : 'bg-white border border-slate-100 text-slate-700'}`}>
                          <p className="leading-relaxed">{message.content}</p>
                          <p className={`mt-1 text-[10px] ${fromAdmin ? 'text-blue-100' : 'text-slate-400'}`}>{formatTime(message.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <footer className="border-t border-slate-100 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <input
                      className="flex-1 rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-(--primary)"
                      placeholder="Reply to this user..."
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && sendReply()}
                    />
                    <button
                      type="button"
                      onClick={sendReply}
                      disabled={saving || !reply.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-(--primary) px-5 py-3 text-sm font-bold text-white hover:bg-[#253D80] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send
                      <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                  </div>
                </footer>
              </div>

              <aside className="space-y-5 p-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Admin</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{activeTicket.assignedAdminName || 'Unassigned'}</p>
                  <p className="text-xs text-slate-500">{activeTicket.assignedAdminRole || 'Support queue'}</p>
                </div>

                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                  <select
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                    value={activeTicket.status || 'open'}
                    onChange={(event) => updateTicket({ status: event.target.value })}
                  >
                    {statuses.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Priority</span>
                  <select
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                    value={activeTicket.priority || 'normal'}
                    onChange={(event) => updateTicket({ priority: event.target.value })}
                  >
                    {priorities.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Admin Notes</span>
                  <textarea
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                    rows={7}
                    value={activeTicket.adminNotes || ''}
                    onChange={(event) => setTickets((prev) => prev.map((ticket) => ticket.id === activeTicket.id ? { ...ticket, adminNotes: event.target.value } : ticket))}
                    onBlur={(event) => updateTicket({ adminNotes: event.target.value })}
                    placeholder="Internal notes for admins..."
                  />
                </label>
              </aside>
            </div>
          ) : (
            <div className="flex h-full min-h-[620px] flex-col items-center justify-center text-center text-slate-500">
              <span className="material-symbols-outlined text-5xl text-slate-300">support_agent</span>
              <p className="mt-3 text-sm font-medium">Select a support request to review.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
