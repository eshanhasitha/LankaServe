import { useState } from 'react';
import HelpCenterChatbot from '../../components/HelpCenterChatbot.tsx';

const helpCards = [
  {
    icon: 'campaign',
    iconClass: 'bg-blue-50 text-blue-600',
    title: 'How to Post a Service',
    description: 'Step-by-step guide to list your skills and start earning.',
  },
  {
    icon: 'shield',
    iconClass: 'bg-emerald-50 text-emerald-600',
    title: 'Account & Security',
    description: 'Secure your profile and manage login preferences.',
  },
  {
    icon: 'verified',
    iconClass: 'bg-purple-50 text-purple-600',
    title: 'Trust & Verification',
    description: 'Everything you need to know about getting verified.',
  },
];

const faqItems = [
  {
    id: 'faq-1',
    question: 'How does job verification work?',
    answer: 'Job verification confirms provider and customer identity at service start, helping prevent fraud and disputes.',
  },
  {
    id: 'faq-2',
    question: 'When is payment released to providers?',
    answer: 'Payment is released after completion confirmation and successful platform payout processing.',
  },
  {
    id: 'faq-3',
    question: 'What should I do if a dispute arises?',
    answer: 'Open a support ticket from this page with job details, chat evidence, and any attachments.',
  },
  {
    id: 'faq-4',
    question: 'Can I cancel a service request after booking?',
    answer: 'Yes, but cancellation terms depend on job status and platform policy shown in job details.',
  },
];

const supportRequests = [
  {
    id: 'TK-102',
    status: 'In Progress',
    statusClass: 'bg-amber-50 text-amber-600',
    title: 'Verification',
    description: 'Problem with verification',
    updatedText: 'Updated 2 hours ago',
  },
  {
    id: 'TK-098',
    status: 'Resolved',
    statusClass: 'bg-emerald-50 text-emerald-600',
    title: 'Job Issue',
    description: 'Customer marked job as incomplete wrongly.',
    updatedText: 'Closed on Oct 24, 2023',
  },
];

export default function ProviderHelpPage() {
  const [openFaqId, setOpenFaqId] = useState(null);

  function toggleFaq(id) {
    setOpenFaqId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="p-12 max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-slate-900 mb-2">Help Center</h1>
        <p className="text-slate-500 mb-8">Find answers or get support for your LankaServe account.</p>
        <div className="max-w-2xl mx-auto relative">
          <span className="absolute inset-y-0 left-5 flex items-center text-slate-400">
            <span className="material-symbols-outlined">search</span>
          </span>
          <input
            className="w-full pl-14 pr-6 py-4 bg-white border-transparent rounded-full shadow-sm text-sm focus:ring-2 focus:ring-[#2F4DA0] focus:border-transparent transition-all"
            placeholder="Search help articles..."
            type="text"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {helpCards.map((card) => (
          <article
            key={card.title}
            className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className={`w-12 h-12 ${card.iconClass} rounded-xl flex items-center justify-center mb-4`}>
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <h3 className="font-bold text-slate-800 mb-2 text-sm">{card.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
          </article>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-12 overflow-hidden">
        <header className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold">Frequently Asked Questions</h2>
          <button className="text-[#2F4DA0] text-sm font-semibold hover:underline" type="button">
            View All FAQ
          </button>
        </header>

        <div className="divide-y divide-slate-100">
          {faqItems.map((item) => {
            const isOpen = openFaqId === item.id;
            return (
              <div key={item.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleFaq(item.id)}>
                <div className="p-6 flex items-center justify-between">
                  <h4 className="font-semibold text-slate-700 text-sm">{item.question}</h4>
                  <span className="material-symbols-outlined text-slate-400">{isOpen ? 'expand_less' : 'expand_more'}</span>
                </div>
                {isOpen ? (
                  <div className="px-6 pb-6 -mt-2">
                    <p className="text-sm text-slate-500">{item.answer}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-bold mb-6">Contact Support</h2>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Subject</label>
              <select className="w-full rounded-xl border-slate-200 focus:border-[#2F4DA0] focus:ring-[#2F4DA0] text-sm transition-all">
                <option>Select a category</option>
                <option>Payment Issue</option>
                <option>Technical Problem</option>
                <option>Account Access</option>
                <option>Verification Help</option>
                <option>Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Message</label>
              <textarea
                className="w-full rounded-xl border-slate-200 focus:border-[#2F4DA0] focus:ring-[#2F4DA0] text-sm transition-all"
                placeholder="Describe your issue in detail..."
                rows={5}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Attachments</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 hover:border-[#2F4DA0] transition-all cursor-pointer">
                <span className="material-symbols-outlined text-slate-400">cloud_upload</span>
                <span className="text-sm text-slate-500 font-medium">Click to upload or drag and drop</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">JPG, PNG or PDF (Max 5MB)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                className="w-full md:w-auto px-10 py-3 rounded-xl bg-[#2F4DA0] text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all"
                type="submit"
              >
                Submit Ticket
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
              {supportRequests.map((item) => (
                <article
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400 group-hover:text-[#2F4DA0]">#{item.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.statusClass}`}>{item.status}</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-500 truncate">{item.description}</p>
                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    {item.updatedText}
                  </p>
                </article>
              ))}

              <button
                className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-[#2F4DA0] transition-colors border-t border-slate-50 mt-4"
                type="button"
              >
                View all requests
              </button>
            </div>
          </div>
        </section>
      </div>

      <HelpCenterChatbot role="provider" />
    </div>
  );
}

