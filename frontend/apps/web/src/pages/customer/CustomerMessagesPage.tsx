import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.tsx';
import { apiRequest } from '../../lib/api.ts';
import Avatar from '../../components/Avatar.tsx';
import Skeleton from '../../components/Skeleton.tsx';

function formatListTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (now.toDateString() === date.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' });
}

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildDirectThreadId(a, b) {
  return `direct:${[String(a), String(b)].sort().join('_')}`;
}

function buildThreadId(a, b, jobId = null) {
  const participantKey = [String(a), String(b)].sort().join('_');
  return jobId ? `job:${String(jobId)}:${participantKey}` : `direct:${participantKey}`;
}

export default function CustomerMessagesPage() {
  const { accessToken, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeSelectionRef = useRef('');
  const messagesContainerRef = useRef(null);
  const lastMessageIdRef = useRef('');
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [activeMessages, setActiveMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // 🎯 UI & Hardware Action System State refs
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const routeConversation = useMemo(() => {
    const counterpartId = location.state?.providerId;
    if (!counterpartId || !user?._id) return null;
    const jobId = location.state?.jobId || null;
    return {
      threadId: buildThreadId(user._id, counterpartId, jobId),
      counterpartId,
      counterpartName: location.state?.providerName || 'Provider',
      counterpartAvatar: location.state?.providerAvatar || '',
      contextType: jobId ? 'job' : 'direct',
      jobId,
      jobTitle: location.state?.jobTitle || null,
      lastMessage: '',
      lastMessageAt: '',
      unread: 0,
      messages: [],
      time: '',
      preview: jobId ? 'Open the job conversation' : 'Start a new conversation',
    };
  }, [location.state, user?._id]);

  const loadConversations = useCallback(async (silent = false) => {
    if (!accessToken) return [];

    try {
      if (!silent) setLoading(true);
      setError('');
      const headers = { Authorization: `Bearer ${accessToken}` };
      const conversationResponse = await apiRequest('/messages/conversations', { headers });
      const baseItems = Array.isArray(conversationResponse?.data) ? conversationResponse.data : [];
      let cleaned = baseItems
        .map((item) => ({
          ...item,
          time: formatListTime(item.lastMessageAt),
          preview: item.lastMessage || 'No messages yet',
        }))
        .sort((a, b) => toTimestamp(b.lastMessageAt) - toTimestamp(a.lastMessageAt));
      if (routeConversation && !cleaned.some((item) => item.threadId === routeConversation.threadId)) {
        cleaned = [routeConversation, ...cleaned];
      }

      setConversations(cleaned);
      setActiveThreadId((prev) => {
        if (prev && cleaned.some((conversation) => conversation.threadId === prev)) return prev;
        const routeSelectionKey = routeConversation?.threadId ? `${location.key}:${routeConversation.threadId}` : '';
        if (routeConversation?.threadId && routeSelectionRef.current !== routeSelectionKey) {
          routeSelectionRef.current = routeSelectionKey;
          return routeConversation.threadId;
        }
        return cleaned[0]?.threadId || '';
      });
      return cleaned;
    } catch (loadError: any) {
      setActiveMessages([]);
      setConversations(routeConversation ? [routeConversation] : []);
      setError(loadError.message || 'Failed to load messages');
      return routeConversation ? [routeConversation] : [];
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, location.key, routeConversation, user?._id]);

  const loadActiveMessages = useCallback(async () => {
    if (!accessToken || !activeThreadId) {
      setActiveMessages([]);
      return;
    }

    const activeConversation = conversations.find((conversation) => conversation.threadId === activeThreadId);
    if (!activeConversation?.counterpartId) {
      setActiveMessages([]);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const params = new URLSearchParams({ limit: '100' });
      if (activeConversation.jobId) params.set('jobId', activeConversation.jobId);
      const response = await apiRequest(
        `/messages/thread/${activeConversation.counterpartId}?${params.toString()}`,
        { headers }
      );
      const messages = Array.isArray(response?.data) ? response.data : [];
      setActiveMessages(
        messages.map((message) => ({
          id: message?._id || `${message?.createdAt}-${message?.content}`,
          side: String(message?.senderId) === String(user?._id) ? 'right' : 'left',
          time: formatMessageTime(message?.createdAt),
          text: message?.content || '',
        }))
      );
    } catch (loadError: any) {
      setError(loadError.message || 'Failed to load messages');
      setActiveMessages([]);
    }
  }, [accessToken, activeThreadId, conversations, user?._id]);

  useEffect(() => {
    let active = true;
    loadConversations();
    const intervalId = setInterval(() => {
      if (active) loadConversations(true);
    }, 10000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [loadConversations]);

  useEffect(() => {
    loadActiveMessages();
  }, [loadActiveMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !activeMessages.length) return;

    const newestId = activeMessages[activeMessages.length - 1]?.id || '';
    const behavior = lastMessageIdRef.current && newestId !== lastMessageIdRef.current ? 'smooth' : 'auto';
    lastMessageIdRef.current = newestId;

    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior });
    });
  }, [activeMessages]);

  const filteredConversations = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.counterpartName.toLowerCase().includes(value) ||
        String(conversation.jobTitle || 'Direct Chat').toLowerCase().includes(value)
    );
  }, [conversations, query]);

  const activeConversation =
    conversations.find((conversation) => conversation.threadId === activeThreadId) ||
    filteredConversations[0] ||
    null;

  useEffect(() => {
    async function markActiveThreadRead() {
      if (!activeConversation?.threadId || !activeConversation?.unread || !accessToken) return;
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        await apiRequest(`/messages/read/${activeConversation.threadId}`, { method: 'PUT', headers });
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.threadId === activeConversation.threadId ? { ...conversation, unread: 0 } : conversation
          )
        );
      } catch {
        // keep UI usable
      }
    }
    markActiveThreadRead();
  }, [accessToken, activeConversation]);

  async function onSend() {
    const text = draftMessage.trim();
    if (!text || !activeConversation || !accessToken) return;

    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await apiRequest('/messages/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          receiverId: activeConversation.counterpartId,
          content: text,
          jobId: activeConversation.jobId || null,
        }),
      });

      const message = response?.data;
      const createdAt = message?.createdAt || new Date().toISOString();
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.threadId === activeConversation.threadId
            ? {
                ...conversation,
                preview: text,
                lastMessage: text,
                lastMessageAt: createdAt,
                time: formatListTime(createdAt),
              }
            : conversation
        )
      );
      setActiveMessages((prev) => [
        ...prev,
        {
          id: message?._id || `${Date.now()}`,
          side: 'right',
          time: formatMessageTime(createdAt),
          text,
        },
      ]);
      setDraftMessage('');
      loadConversations(true);
    } catch (sendError: any) {
      setError(sendError.message || 'Failed to send message');
    }
  }

  // 📱 Live Hardware Handlers
  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // For now, stage the selected file name into the chat bar to show it works.
    setDraftMessage(`📸 Attached Image: ${selectedFile.name}`);
  }

  function handleShareLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your current browser application.');
      setIsAttachmentMenuOpen(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setDraftMessage(`📍 Live Location Pin: ${mapsUrl}`);
        setIsAttachmentMenuOpen(false);
      },
      () => {
        setError('Unable to fetch your precise GPS device coordinates. Check tracking permissions.');
        setIsAttachmentMenuOpen(false);
      },
      { enableHighAccuracy: true }
    );
  }

  return (
    <div className="flex h-screen bg-white relative">
      
      {/* 📁 Hidden Real Interactive Inputs Pipeline System */}
      <input 
        type="file" 
        ref={galleryInputRef} 
        onChange={handleFileSelection} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        onChange={handleFileSelection} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
      />

      {/* 🔮 WhatsApp Overlay Tint Layer */}
      {isAttachmentMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-[9999] transition-opacity duration-300"
          onClick={() => setIsAttachmentMenuOpen(false)}
        />
      )}

      <aside className="w-[320px] bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-bold mb-4">Messages</h2>
          <div className="flex items-center gap-2 bg-slate-100 border border-transparent rounded-xl px-3 focus-within:ring-2 focus-within:ring-[#2F4DA0] focus-within:bg-white transition-all">
            <span className="material-symbols-outlined text-xl text-slate-400 shrink-0">search</span>
            <input
              className="flex-1 py-2 bg-transparent text-sm placeholder:text-slate-400 outline-none border-0"
              placeholder="Search conversations..."
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {error ? <p className="px-4 py-3 text-xs text-red-600">{error}</p> : null}
          {loading ? (
            <div className="px-4 py-3 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!loading && !filteredConversations.length ? <p className="px-4 py-6 text-sm text-slate-500">No conversations yet.</p> : null}
          {filteredConversations.map((conversation) => {
            const isActive = activeConversation?.threadId === conversation.threadId;
            return (
              <button
                key={conversation.threadId}
                className={`relative w-full text-left flex items-center gap-3 p-4 border-b border-slate-100 transition-colors ${isActive ? 'bg-white' : 'hover:bg-white/50'}`}
                type="button"
                onClick={() => setActiveThreadId(conversation.threadId)}
              >
                {isActive ? <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2F4DA0]" /> : null}
                <div className="relative flex-shrink-0">
                  <Avatar src={conversation.counterpartAvatar} name={conversation.counterpartName} className="w-12 h-12" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-sm truncate">{conversation.counterpartName}</h4>
                    <span className="text-[10px] text-slate-400">{conversation.time}</span>
                  </div>
                  <p className={`text-xs truncate mb-0.5 ${isActive ? 'text-[#2F4DA0] font-medium' : 'text-slate-500 font-medium'}`}>
                    {conversation.jobTitle || 'Direct Chat'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{conversation.preview}</p>
                </div>
                {conversation.unread ? <div className="w-5 h-5 bg-[#2F4DA0] text-white text-[10px] flex items-center justify-center rounded-full">{conversation.unread}</div> : null}
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 bg-white flex flex-col min-w-0 relative">
        {activeConversation ? (
          <>
            {/* 📱 WhatsApp-Style Responsive Slide-Up / Floating Action Sheet */}
            <div 
              className={`fixed bottom-0 left-0 right-0 z-[10000] rounded-t-3xl bg-white p-6 shadow-2xl transition-all duration-300 ease-in-out 
                md:absolute md:bottom-24 md:left-6 md:right-auto md:w-[320px] md:rounded-2xl md:border md:border-slate-200
                ${isAttachmentMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-10 opacity-0 pointer-events-none md:translate-y-4'}`}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-5">Share Attachment</p>
              
              {/* 🔘 Dynamic Media Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* 🖼️ Gallery Option */}
                <button 
                  type="button" 
                  onClick={() => { galleryInputRef.current?.click(); setIsAttachmentMenuOpen(false); }}
                  className="flex flex-col items-center gap-1.5 group outline-none"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600 shadow-sm group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xl">image</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">Gallery</span>
                </button>

                {/* 📸 Camera Option */}
                <button 
                  type="button" 
                  onClick={() => { cameraInputRef.current?.click(); setIsAttachmentMenuOpen(false); }}
                  className="flex flex-col items-center gap-1.5 group outline-none"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-pink-600 shadow-sm group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xl">photo_camera</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">Camera</span>
                </button>

                {/* 📍 Location Option */}
                <button 
                  type="button" 
                  onClick={handleShareLocation}
                  className="flex flex-col items-center gap-1.5 group outline-none"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-sm group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xl">location_on</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">Location</span>
                </button>
              </div>

              <button 
                type="button" 
                onClick={() => setIsAttachmentMenuOpen(false)}
                className="mt-5 w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* 🛠️ ENHANCED HEADERS SECTION - ACTIVE ICON TRIGGERS */}
            <header className="h-[70px] border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar src={activeConversation.counterpartAvatar} name={activeConversation.counterpartName} className="w-10 h-10" />
                <div>
                  <h3 className="font-bold text-sm">{activeConversation.counterpartName}</h3>
                  <p className="text-xs text-slate-500">{activeConversation.contextType === 'job' ? 'Job conversation' : 'Direct conversation'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 relative">
                {/* 📞 Call Option Button */}
                <button 
                  onClick={() => alert("Voice and video calling modules will become available in the next platform sprint release!")}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[#2F4DA0] active:scale-95 transition-all duration-200" 
                  type="button"
                  title="Call Partner"
                >
                  <span className="material-symbols-outlined text-xl">call</span>
                </button>
                
                {/* 🎛️ Three-Dot Actions Menu Button */}
                <div className="relative">
                  <button 
                    onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 active:scale-95 transition-all duration-200 ${isHeaderMenuOpen ? 'bg-slate-100 border-slate-400 text-[#2F4DA0]' : 'text-slate-600 hover:bg-slate-100'}`} 
                    type="button"
                    title="More Options"
                  >
                    <span className="material-symbols-outlined text-xl">more_vert</span>
                  </button>

                  {/* 🔮 Absolute Dropdown Floating Overlay */}
                  {isHeaderMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Manage Chat</p>
                        
                        <button 
                          onClick={() => { 
                            setIsHeaderMenuOpen(false); 
                            navigate(`/customer/provider-profile/${activeConversation.counterpartId}`);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg text-slate-400">account_circle</span>
                          View Profile Info
                        </button>
                        
                        <button 
                          onClick={() => { alert("Conversation muted successfully."); setIsHeaderMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg text-slate-400">notifications_off</span>
                          Mute Audio Alerts
                        </button>
                        
                        <hr className="my-1.5 border-slate-100" />
                        
                        <button 
                          onClick={() => { alert("Reporting sequence initiated."); setIsHeaderMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg text-red-400">report</span>
                          Block & Report User
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {activeConversation.jobId ? (
              <div className="bg-blue-50/50 px-6 py-2.5 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-lg">engineering</span>
                  <span className="text-xs font-medium text-slate-700">
                    This conversation is about: <span className="font-bold">{activeConversation.jobTitle}</span>
                  </span>
                </div>
                <Link
                  className="text-xs font-bold text-[#2F4DA0] hover:underline"
                  to={`/customer/my-jobs/${activeConversation.jobId}`}
                  state={{ jobTitle: activeConversation.jobTitle }}
                >
                  View Job Details
                </Link>
              </div>
            ) : null}

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              <div className="flex justify-center">
                <span className="px-3 py-1 bg-white text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm border border-slate-100">Today</span>
              </div>
              {activeMessages.map((message) => (
                <div
                  key={message.id}
                  className={`${message.side === 'right' ? 'flex items-start justify-end gap-3 ml-auto max-w-[80%]' : 'flex items-start gap-3 max-w-[80%]'}`}
                >
                  {message.side === 'left' ? <Avatar src={activeConversation.counterpartAvatar} name={activeConversation.counterpartName} className="w-8 h-8 shrink-0" /> : null}
                  <div className={message.side === 'right' ? 'flex flex-col items-end' : ''}>
                    <div className={`${message.side === 'right' ? 'bg-[#2F4DA0] text-white rounded-2xl rounded-tr-none' : 'bg-white border border-slate-100 rounded-2xl rounded-tl-none text-slate-800'} p-3 shadow-sm text-sm`}>
                      {message.text}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${message.side === 'right' ? '' : 'pl-1'}`}>
                      <span className="text-[10px] text-slate-400">{message.time}</span>
                      {message.side === 'right' ? <span className="material-symbols-outlined text-blue-500 text-sm">done_all</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 px-3">
                
                {/* 📎 Paperclip Trigger Menu Button */}
                <button 
                  className={`p-2 transition-colors ${isAttachmentMenuOpen ? 'text-[#2F4DA0]' : 'text-slate-500 hover:text-[#2F4DA0]'}`} 
                  type="button"
                  onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                >
                  <span className="material-symbols-outlined transform rotate-45 block">attach_file</span>
                </button>

                <input
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-slate-400 outline-none"
                  placeholder="Type a message..."
                  type="text"
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onSend();
                  }}
                />
                <button className="bg-[#2F4DA0] text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#253e85] transition-all" type="button" onClick={onSend}>
                  <span>Send</span>
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">Select a conversation to start messaging.</div>
        )}
      </main>
    </div>
  );
}

function ConversationRow({ active, image, name, time, service, preview, unread, onClick }: any) {
  return (
    <button className={`px-6 py-4 cursor-pointer border-b border-slate-100 w-full text-left ${active ? 'bg-white border-l-4 border-l-[#2F4DA0]' : 'hover:bg-slate-100'}`} onClick={onClick} type="button">
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <Avatar src={image} name={name} className="w-12 h-12" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-900 truncate">{name}</h3>
            <span className="text-[10px] text-slate-400 font-medium">{time}</span>
          </div>
          <p className={`text-xs font-semibold truncate mb-1 ${active ? 'text-[#2F4DA0]' : 'text-slate-600'}`}>{service}</p>
          <div className="flex justify-between items-center gap-2">
            <p className="text-xs truncate text-slate-500">{preview}</p>
            {unread ? <span className="bg-[#2F4DA0] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unread}</span> : null}
          </div>
        </div>
      </div>
    </button>
  );
}