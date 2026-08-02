import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth-context.tsx';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (sameDay) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

export default function AdminChatPage() {
  const { admin, authorizedRequest } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const bottomRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeUserId, setActiveUserId] = useState(searchParams.get('user') || searchParams.get('userId') || '');
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [query, setQuery] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((item) => {
      const haystack = [
        item.counterpartName,
        item.lastMessage,
        item.jobTitle,
        item.threadId,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [conversations, query]);

  const activeConversation = useMemo(
    () => conversations.find((item) => String(item.counterpartId) === String(activeUserId)) || filteredConversations[0] || conversations[0] || null,
    [activeUserId, conversations, filteredConversations],
  );

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    setError('');

    try {
      const response = await authorizedRequest('/admin/support-chats/conversations');
      const items = Array.isArray(response?.data) ? response.data : [];
      setConversations(items);
      setActiveUserId((prev) => {
        if (prev && items.some((item) => String(item.counterpartId) === String(prev))) return prev;

        const routeUserId = searchParams.get('user') || searchParams.get('userId');
        if (routeUserId && items.some((item) => String(item.counterpartId) === String(routeUserId))) {
          return routeUserId;
        }

        return items[0]?.counterpartId || '';
      });
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load support chats');
      setConversations([]);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, [authorizedRequest, searchParams]);

  const loadMessages = useCallback(async () => {
    const userId = activeConversation?.counterpartId || activeUserId;
    if (!userId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const response = await authorizedRequest(`/admin/support-chats/thread/${userId}?limit=120`);
      setMessages(Array.isArray(response?.data) ? response.data : []);

      if (activeConversation?.threadId) {
        await authorizedRequest(`/admin/support-chats/read/${encodeURIComponent(activeConversation.threadId)}`, {
          method: 'PUT',
        }).catch(() => {});
      }
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load chat thread');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeConversation?.counterpartId, activeConversation?.threadId, activeUserId, authorizedRequest]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!activeConversation?.counterpartId) return;
    if (searchParams.get('user') === String(activeConversation.counterpartId)) return;

    const next = new URLSearchParams(searchParams);
    next.set('user', activeConversation.counterpartId);
    next.delete('userId');
    setSearchParams(next, { replace: true });
  }, [activeConversation?.counterpartId, searchParams, setSearchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, activeConversation?.counterpartId]);

  async function sendReply() {
    const text = reply.trim();
    const userId = activeConversation?.counterpartId || activeUserId;
    if (!text || !userId) return;

    setSending(true);
    setError('');

    try {
      const response = await authorizedRequest('/admin/support-chats/send', {
        method: 'POST',
        body: JSON.stringify({ userId, content: text }),
      });

      if (response?.data) {
        setMessages((prev) => [...prev, response.data]);
      }
      setReply('');
      await loadConversations(true);
    } catch (sendError) {
      setError(sendError?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support Chat</h1>
          <p className="mt-1 text-sm text-slate-500">Reply to customer and provider admin-support conversations from one inbox.</p>
        </div>
        <button
          type="button"
          onClick={() => loadConversations()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh
        </button>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="grid min-h-[calc(100vh-180px)] grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[390px_1fr]">
        <aside className="border-r border-slate-100">
          <div className="border-b border-slate-100 p-5">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#3151B7]"
                placeholder="Search support chats..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="h-[calc(100vh-275px)] overflow-y-auto p-3">
            {loadingConversations ? <p className="p-4 text-sm text-slate-500">Loading chats...</p> : null}
            {!loadingConversations && !filteredConversations.length ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">forum</span>
                <p className="mt-2 text-sm font-medium text-slate-500">No support chats yet.</p>
              </div>
            ) : null}

            <div className="space-y-2">
              {filteredConversations.map((conversation) => {
                const active = String(conversation.counterpartId) === String(activeConversation?.counterpartId);
                const unread = Number(conversation.unread || 0);

                return (
                  <button
                    key={conversation.threadId}
                    type="button"
                    onClick={() => setActiveUserId(conversation.counterpartId)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active ? 'border-[#3151B7] bg-blue-50/60' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3151B7] text-sm font-bold text-white">
                        {conversation.counterpartAvatar ? (
                          <img src={conversation.counterpartAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : initials(conversation.counterpartName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">{conversation.counterpartName || 'User'}</p>
                          <span className="shrink-0 text-[10px] font-medium text-slate-400">{formatTime(conversation.lastMessageAt)}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage || 'No messages yet'}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Support</span>
                          {unread ? (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                              {unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col">
          {activeConversation ? (
            <>
              <header className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3151B7] text-sm font-bold text-white">
                    {activeConversation.counterpartAvatar ? (
                      <img src={activeConversation.counterpartAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : initials(activeConversation.counterpartName)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{activeConversation.counterpartName || 'User'}</h2>
                    <p className="text-xs font-medium text-slate-500">Admin support thread</p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Active Chat
                </span>
              </header>

              <div className="flex-1 overflow-y-auto bg-slate-50/70 p-6">
                {loadingMessages ? <p className="text-sm text-slate-500">Loading messages...</p> : null}
                {!loadingMessages && !messages.length ? (
                  <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300">chat</span>
                    <p className="mt-3 text-sm font-medium text-slate-500">No messages in this thread yet.</p>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {messages.map((message) => {
                    const fromAdmin = String(message.senderId) === String(admin?._id);

                    return (
                      <div key={message._id || `${message.createdAt}-${message.content}`} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          fromAdmin ? 'bg-[#3151B7] text-white' : 'border border-slate-100 bg-white text-slate-700'
                        }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <p className={`mt-1 text-[10px] ${fromAdmin ? 'text-blue-100' : 'text-slate-400'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>

              <footer className="border-t border-slate-100 bg-white p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    className="max-h-36 min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-transparent focus:bg-white focus:ring-2 focus:ring-[#3151B7]"
                    placeholder="Type a support reply..."
                    value={reply}
                    rows={1}
                    onChange={(event) => setReply(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#3151B7] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#253D80] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send'}
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex h-full min-h-[620px] flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">support_agent</span>
              <h2 className="mt-3 text-lg font-bold text-slate-900">No chat selected</h2>
              <p className="mt-1 text-sm text-slate-500">Select a support conversation from the inbox.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
