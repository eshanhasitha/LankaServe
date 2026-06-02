import { useState } from 'react';
import HelpCenterChatbot from '../../components/HelpCenterChatbot.tsx';
import SupportRequestSection from '../../components/SupportRequestSection.tsx';

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
    answer: 'The provider scans your QR code on site, which confirms identity and starts the secure job session.',
  },
  {
    id: 'faq-2',
    question: 'When is payment released to providers?',
    answer: 'Payment is released only after both customer and provider confirm the job is completed.',
  },
  {
    id: 'faq-3',
    question: 'What should I do if a dispute arises?',
    answer: 'Open a support ticket with job details and evidence. Our support team reviews and resolves disputes.',
  },
  {
    id: 'faq-4',
    question: 'Can I cancel a service request after booking?',
    answer: 'Yes. Cancellation is possible based on job status and cancellation policy shown in your job details.',
  },
];

export default function CustomerHelpPage() {
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
          <button className="text-[#2F4DA0] text-sm font-semibold hover:underline" type="button">View All FAQ</button>
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

      <SupportRequestSection />

      <HelpCenterChatbot role="customer" />
    </div>
  );
}


