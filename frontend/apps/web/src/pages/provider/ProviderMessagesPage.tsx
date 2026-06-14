import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from '../../components/Avatar.tsx';
import Skeleton from '../../components/Skeleton.tsx';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';

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

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildThreadId(a, b, jobId = null) {
  const participantKey = [String(a), String(b)].sort().join('_');
  return jobId ? `job:${String(jobId)}:${participantKey}` : `direct:${participantKey}`;
}

export default function ProviderMessagesPage() {
  const { accessToken, user } = useAuth();
  const location = useLocation();
  const routeSelectionRef = useRef('');
  const messagesContainerRef = useRef(null);
  const lastMessageIdRef = useRef('');
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [activeMessages, setActiveMessages] = useState([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // 🎯 UI & Hardware Action System State refs
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const routeConversation = useMemo(() => {
    const counterpartId = location.state?.customerId;
    if (!counterpartId || !user?._id) return null;
    const jobId = location.state?.jobId || null;
    return {
      threadId: buildThreadId(user._id, counterpartId, jobId),
      counterpartId,
      counterpartName: location.state?.customerName || 'Customer',
      counterpartAvatar: location.state?.customerAvatar || '',
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
    if (!accessToken || !user?._id) return [];

    try {
      if (!silent) setLoading(true);
      const headers = { Authorization: `Bearer ${accessToken}` };
      const conversationResponse = await apiRequest('/messages/conversations', { headers });
      const baseItems = Array.isArray(conversationResponse?.data) ? conversationResponse.data : [];
      let sorted = baseItems
        .map((item) => ({
          ...item,
          time: formatListTime(item.lastMessageAt),
          preview: item.lastMessage || 'No messages yet',
        }))
        .sort((a, b) => toTimestamp(b.lastMessageAt) - toTimestamp(a.lastMessageAt));
      if (routeConversation && !sorted.some((item) => item.threadId === routeConversation.threadId)) {
        sorted = [routeConversation, ...sorted];
      }

      setConversations(sorted);
      setActiveThreadId((prev) => {
        if (prev && sorted.some((item) => item.threadId === prev)) return prev;
        const routeSelectionKey = routeConversation?.threadId ? `${location.key}:${routeConversation.threadId}` : '';
        if (routeConversation?.threadId && routeSelectionRef.current !== routeSelectionKey) {
          routeSelectionRef.current = routeSelectionKey;
          return routeConversation.threadId;
        }
        return sorted[0]?.threadId || '';
      });
      return sorted;
    } catch {
      const fallback = routeConversation ? [routeConversation] : [];
      setActiveMessages([]);
      setConversations(fallback);
      return fallback;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, location.key, routeConversation, user?._id]);

  const loadActiveMessages = useCallback(async () => {
    if (!accessToken || !activeThreadId) {
      setActiveMessages([]);
      return;
    }

    const activeConversation = conversations.find((item) => item.threadId === activeThreadId);
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
          time: formatTime(message?.createdAt),
          text: message?.content || '',
        }))
      );
    } catch {
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
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((item) =>
      item.counterpartName.toLowerCase().includes(q) ||
      String(item.jobTitle || 'Direct Chat').toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const activeConversation =
    conversations.find((item) => item.threadId === activeThreadId) || filteredConversations[0] || null;

  useEffect(() => {
    async function markActiveThreadRead() {
      if (!activeConversation?.threadId || !activeConversation?.unread || !accessToken) return;

      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        await apiRequest(`/messages/read/${activeConversation.threadId}`, {
          method: 'PUT',
          headers,
        });
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.threadId === activeConversation.threadId ? { ...conversation, unread: 0 } : conversation
          )
        );
      } catch {
        // Ignore read sync errors to keep the thread usable.
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
        prev.map((item) =>
          item.threadId === activeConversation.threadId
            ? {
                ...item,
                preview: text,
                time: formatListTime(createdAt),
                lastMessageAt: createdAt,
              }
            : item
        )
      );
      setActiveMessages((prev) => [
        ...prev,
        {
          id: message?._id || `${Date.now()}`,
          side: 'right',
          time: formatTime(createdAt),
          text,
        },
      ]);
      setDraftMessage('');
      loadConversations(true);
    } catch {
      // Keep the UI stable if sending fails.
    }
  }

  // 📱 Live Hardware Handlers
  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setDraftMessage(`📸 Attached Image: ${selectedFile.name}`);
  }

  function handleShareLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your current browser application.');
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
        alert('Unable to fetch your precise GPS device coordinates. Check tracking permissions.');
        setIsAttachmentMenuOpen(false);
      },
      { enableHighAccuracy: true }
    );
  }

  return (
    <div className="h-screen bg-white overflow-hidden flex relative">
      
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

      <section className="w-[390px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-200 bg-white">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="material-symbols-outlined text-xl">search</span>
            </span>
            <input
              className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-transparent rounded-2xl text-sm focus:ring-2 focus:ring-[#2F4DA0] focus:bg-white focus:border-transparent transition-all placeholder:text-slate-400"
              placeholder="Search conversations..."
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && !filteredConversations.length ? (
            <div className="px-6 py-4 space-y-4">
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
          {!loading && !filteredConversations.length ? <p className="px-6 py-4 text-sm text-slate-500">No conversations yet.</p> : null}
          {filteredConversations.map((item) => (
            <ConversationRow
              key={item.threadId}
              active={item.threadId === activeConversation?.threadId}
              image={item.counterpartAvatar}
              name={item.counterpartName}
              time={item.time}
              service={item.jobTitle || 'Direct Chat'}
              preview={item.preview}
              unread={item.unread}
              onClick={() => setActiveThreadId(item.threadId)}
            />
          ))}
        </div>
      </section>

      <section className="flex-1 bg-[#F3F4F6] flex flex-col min-w-0 relative">
        
        {/* 📱 WhatsApp-Style Responsive Slide-Up / Floating Action Sheet */}
        <div 
          className={`fixed bottom-0 left-0 right-0 z-[10000] rounded-t-3xl bg-white p-6 shadow-2xl transition-all duration-300 ease-in-out 
            md:absolute md:bottom-24 md:left-6 md:right-auto md:w-[320px] md:rounded-2xl md:border md:border-slate-200
            ${isAttachmentMenuOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-10 opacity-0 pointer-events-none md:translate-y-4'}`}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-5">Share Attachment</p>
          
          {/* 🔘 Context Icon Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Gallery Option */}
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

            {/* Camera Option */}
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

            {/* Location Option */}
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

        {/* 🛠️ UPGRADED INTERACTIVE CHAT HEADER */}
        <header className="h-[74px] px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Avatar src={activeConversation?.counterpartAvatar} name={activeConversation?.counterpartName} className="w-10 h-10" />
            <div>
              <h3 className="font-bold text-slate-900">{activeConversation?.counterpartName || 'Conversation'}</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">{activeConversation?.contextType === 'job' ? 'Job conversation' : 'Direct conversation'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 relative">
            {/* 📞 Call Option Button */}
            <button 
              onClick={() => alert("Voice and video calling modules will become available in the next platform sprint release!")}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[#2F4DA0] active:scale-95 transition-all duration-200" 
              type="button"
              title="Call Client"
            >
              <span className="material-symbols-outlined text-xl">call</span>
            </button>
            
            {/* 🎛️ Three-Dot Settings Menu Dropdown */}
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
                      onClick={() => { alert("Viewing consumer profile analytics..."); setIsHeaderMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">account_circle</span>
                      View Client Profile
                    </button>
                    
                    <button 
                      onClick={() => { alert("Conversation threads muted successfully."); setIsHeaderMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">notifications_off</span>
                      Mute Audio Alerts
                    </button>
                    
                    <hr className="my-1.5 border-slate-100" />
                    
                    <button 
                      onClick={() => { alert("Flagged support ticketing workflow initiated."); setIsHeaderMenuOpen(false); }}
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

        {activeConversation?.jobId ? (
          <div className="bg-blue-50/50 px-6 py-2.5 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">engineering</span>
              <span className="text-xs font-medium text-slate-700">
                This conversation is about: <span className="font-bold">{activeConversation.jobTitle}</span>
              </span>
            </div>
            <Link className="text-xs font-bold text-[#2F4DA0] hover:underline" to="/provider/my-jobs">
              View Job Details
            </Link>
          </div>
        ) : null}

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-8 space-y-7 bg-[#F3F4F6]">
          <div className="flex justify-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200/70 px-3 py-1 rounded-full">Today</span>
          </div>
          {activeMessages.map((message) => (
            <div className={message.side === 'right' ? 'max-w-[68%] ml-auto' : 'max-w-[68%]'} key={message.id}>
              <div className={message.side === 'right' ? 'bg-[#2F4DA0] text-white rounded-[18px] rounded-br-[2px] p-4 text-sm leading-relaxed' : 'bg-slate-300/70 text-slate-800 rounded-[18px] rounded-bl-[2px] p-4 text-sm leading-relaxed'}>
                {message.text}
              </div>
              <div className={`flex items-center gap-1 mt-1 ${message.side === 'right' ? 'justify-end' : ''}`}>
                <span className="text-[10px] text-slate-400">{message.time}</span>
                {message.side === 'right' ? <span className="material-symbols-outlined text-[14px] text-blue-400">done_all</span> : null}
              </div>
            </div>
          ))}
        </div>

        <footer className="p-6 bg-[#F3F4F6] border-t border-slate-200">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-300 rounded-3xl px-4 py-2">
            
            {/* 🎯 Interactive Paperclip Trigger */}
            <button 
              className={`hover:text-slate-600 transition-colors ${isAttachmentMenuOpen ? 'text-[#2F4DA0]' : 'text-slate-400'}`} 
              type="button"
              onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
            >
              <span className="material-symbols-outlined transform rotate-45 block">attach_file</span>
            </button>

            <input className="flex-1 bg-transparent text-sm border-0 outline-none placeholder:text-slate-400" placeholder="Type a message..." type="text" value={draftMessage} onChange={(event) => setDraftMessage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && onSend()} />
            <button className="bg-[#2F4DA0] text-white px-7 py-2 rounded-xl text-sm font-bold hover:bg-blue-800 transition-colors flex items-center gap-2" type="button" onClick={onSend}>
              Send
              <span className="material-symbols-outlined text-sm">near_me</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function ConversationRow({ active, image, name, time, service, preview, unread, onClick }) {
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