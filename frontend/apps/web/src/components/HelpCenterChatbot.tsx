import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHelpBotReply, getQuickPrompts } from '../lib/help-bot.ts';

function buildMessage(kind, text, actions = []) {
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    text,
    actions,
  };
}

export default function HelpCenterChatbot({ role = 'customer' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(() => [
    buildMessage(
      'bot',
      role === 'provider'
        ? 'I can help with payouts, job requests, disputes, and account issues.'
        : 'I can help with payments, cancellations, verification, and support tickets.',
    ),
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const listEndRef = useRef(null);
  const quickPrompts = useMemo(() => getQuickPrompts(role), [role]);

  useEffect(() => {
    if (!isOpen) return;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages, isTyping]);

  function sendMessage(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return;

    setMessages((prev) => [...prev, buildMessage('user', text)]);
    setDraft('');
    setIsTyping(true);

    window.setTimeout(() => {
      const reply = getHelpBotReply({ message: text, role });
      setMessages((prev) => [...prev, buildMessage('bot', reply.answer, reply.actions)]);
      setIsTyping(false);
    }, 350);
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(draft);
  }

  return (
    <>
      {isOpen ? (
        <section className="fixed inset-x-4 bottom-24 top-20 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col sm:inset-x-auto sm:right-4 sm:w-[420px] sm:top-24">
          <header className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">Help Assistant</h2>
              <p className="text-[11px] text-slate-500">Rule-based assistant for quick answers</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Online
              </span>
              <button
                className="h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close help assistant"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </header>

          <div className="px-4 py-3 border-b border-slate-100 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Quick Prompts</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:border-[#2F4DA0] hover:text-[#2F4DA0] transition-colors"
                  type="button"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50/60 flex-1 min-h-0">
            <div className="h-full overflow-y-auto space-y-3 pr-1">
              {messages.map((message) => {
                const isBot = message.kind === 'bot';
                return (
                  <article key={message.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${isBot ? 'bg-white border border-slate-200 text-slate-700' : 'bg-[#2F4DA0] text-white'}`}>
                      <p className="text-sm leading-relaxed">{message.text}</p>

                      {isBot && Array.isArray(message.actions) && message.actions.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.actions.map((item) => (
                            <Link
                              key={`${message.id}-${item.path}`}
                              className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-[#2F4DA0] hover:bg-blue-100 transition-colors"
                              to={item.path}
                            >
                              {item.label}
                              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}

              {isTyping ? (
                <article className="flex justify-start">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 [animation-delay:240ms]" />
                      Thinking...
                    </span>
                  </div>
                </article>
              ) : null}

              <div ref={listEndRef} />
            </div>
          </div>

          <form className="border-t border-slate-100 p-4 flex gap-2 shrink-0" onSubmit={handleSubmit}>
            <input
              className="flex-1 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]"
              placeholder="Ask about payments, verification, or support tickets..."
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              className="inline-flex items-center gap-1 rounded-xl bg-[#2F4DA0] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              type="submit"
            >
              Send
              <span className="material-symbols-outlined text-[17px]">send</span>
            </button>
          </form>
        </section>
      ) : null}

      {!isOpen ? (
        <button
          className="fixed bottom-6 right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#2F4DA0] text-white shadow-xl shadow-blue-500/30 hover:opacity-90 transition-opacity"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open help assistant"
        >
          <span className="material-symbols-outlined text-[28px]">smart_toy</span>
        </button>
      ) : null}
    </>
  );
}

