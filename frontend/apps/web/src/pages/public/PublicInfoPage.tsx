import { Link, useNavigate } from 'react-router-dom';

const contact = {
  email: 'eshanhasitha55@gmail.com',
  github: 'eshanhasitha',
  whatsapp: '+94774506950',
};

const pages = {
  findPro: {
    title: 'Find a Pro',
    label: 'Quick Links',
    summary: 'Search verified LankaServe professionals by service category, location, rating, and real-time availability across major Sri Lankan districts.',
    items: [
      { icon: 'badge', text: 'Compare transparent provider profiles, verification history, and customer reviews before booking.' },
      { icon: 'manage_search', text: 'Filter down directly by specialized trade fields like Electricians, Plumbers, and Carpenters.' },
      { icon: 'qr_code_scanner', text: 'Confirm on-site arrival using secure app-to-app QR verification before any service begins.' }
    ],
  },
  becomePro: {
    title: 'Become a Pro',
    label: 'Quick Links',
    summary: 'Register as a skilled service provider and start receiving verified local service requests directly within your preferred operating range.',
    items: [
      { icon: 'person_add', text: 'Create your digital business profile, select your core service trade category, and set your area parameters.' },
      { icon: 'assignment', text: 'Easily manage incoming job leads, track accepted service requests, and review historic earnings records.' },
      { icon: 'workspace_premium', text: 'Build a trustworthy local reputation via high completion metrics, positive reviews, and platform safety badges.' }
    ],
  },
  howItWorks: {
    title: 'How LankaServe Works',
    label: 'Platform Workflow',
    summary: 'LankaServe connects customers and skilled professionals using a safe framework anchored by request posting, smart matching, and secure QR-based check-ins.',
    items: [
      { icon: 'rate_review', text: 'Customers post local tasks with clear descriptive criteria, specific location points, and preferred budgets.' },
      { icon: 'handshake', text: 'Verified professionals accept relevant open jobs and securely coordinate directly through platform real-time chat hooks.' },
      { icon: 'gpp_good', text: 'Both parties leverage on-site QR scanning to initiate sessions and dual confirmation buttons to clear safe payment milestones.' }
    ],
  },
  serviceAreas: {
    title: 'Service Areas & Coverage',
    label: 'Coverage Details',
    summary: 'LankaServe is tailored to support household ecosystems starting with highly active dense urban sectors within Western and Central provinces.',
    items: [
      { icon: 'map', text: 'Colombo and immediate municipal suburbs (Colombo 01-15, Rajagiriya, Dehiwala, Nugegoda) are prioritized first.' },
      { icon: 'my_location', text: 'Service providers maintain full freedom to define and adjust their specific preferred district operating boundaries.' },
      { icon: 'analytics', text: 'Dynamic localized demand tracking helps matching funnels balance client request volume against active provider locations.' }
    ],
  },
  helpCenter: {
    title: 'Help Center',
    label: 'Support Portal',
    summary: 'Find rapid answers regarding profile configurations, secure booking operations, wallet tracking parameters, and on-site QR scanning flows.',
    items: [
      { icon: 'mail', text: 'Submit support requests via official mail channels to troubleshoot profile updates or authentication issues.' },
      { icon: 'chat', text: 'Access official WhatsApp service queues for real-time assistance regarding live on-site operational bottlenecks.' },
      { icon: 'shield_heart', text: 'Review customer protection protocols and guidelines before initiating home-visit trade sessions.' }
    ],
  },
  safetyGuide: {
    title: 'Safety & On-Site Security Guide',
    label: 'Support Guidelines',
    summary: 'Mandatory security checklists designed to safeguard both customers and service providers during household trade engagements.',
    items: [
      { icon: 'assignment_ind', text: 'Always cross-reference the incoming tradesperson identity with profile pictures displayed inside the app.' },
      { icon: 'qr_code_2', text: 'Scan the provider app QR token strictly when they are physically on site. Never scan tokens remotely.' },
      { icon: 'lock', text: 'Do not hit the completion confirmation button until the requested task has been fully inspected and completed.' }
    ],
  },
  contact: {
    title: 'Contact Us',
    label: 'Support Channels',
    summary: 'Reach the core LankaServe engineering and platform moderation team directly through our official validation nodes.',
    items: [
      { icon: 'alternate_email', text: `Official Mail Link: ${contact.email}` },
      { icon: 'code', text: `Open Source Source Tree Node: github.com/${contact.github}` },
      { icon: 'phone_in_talk', text: `Direct Workspace Support Helpline: ${contact.whatsapp}` }
    ],
  },
  terms: {
    title: 'Terms of Service',
    label: 'Legal Framework',
    summary: 'These terms constitute a binding operational agreement governing the safe marketplace conduct of customers, providers, and administrators.',
    items: [
      { icon: 'gavel', text: 'Customers explicitly agree to supply accurate job descriptions, precise urban coordinates, and clear budget expectations.' },
      { icon: 'engineering', text: 'Service providers must solely accept trade orders they possess real, verified qualification and skill to execute.' },
      { icon: 'report', text: 'Fraudulent entries, harassment, unsafe behavior, or bypassing escrow channels will result in immediate suspension.' }
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    label: 'Legal Framework',
    summary: 'This policy governs how LankaServe securely processes profile details, job metadata, real-time coordinates, and chat payloads.',
    items: [
      { icon: 'admin_panel_settings', text: 'Account records are strictly utilized for matching algorithms, secure session tracking, and user validation filters.' },
      { icon: 'pin_drop', text: 'Location coordinates are securely captured to compute regional trade distances and feed aggregated demand heatmaps.' },
      { icon: 'lock_person', text: 'All communication streams are encrypted. Users reserve the complete right to request permanent profile erasure.' }
    ],
  },
  cookies: {
    title: 'Cookies & Storage Configuration',
    label: 'Legal Framework',
    summary: 'Details regarding how local cache variables maintain responsive platform states and continuous session authentication.',
    items: [
      { icon: 'cookie', text: 'Essential session metadata handles state validation and keeps dashboard views continuously logged in reliably.' },
      { icon: 'speed', text: 'Performance cache structures store language selection strings across transitions without degrading browser speeds.' },
      { icon: 'delete_forever', text: 'Users retain autonomous authority to clear temporary browser storage arrays directly through native setting menus.' }
    ],
  },
};

export type PublicInfoPageKey = keyof typeof pages;

export default function PublicInfoPage({ pageKey }: { pageKey: PublicInfoPageKey }) {
  const page = pages[pageKey];
  const navigate = useNavigate();
  const whatsappUrl = `https://wa.me/${contact.whatsapp.replace('+', '')}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Inter']">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link 
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#2F4DA0] transition-colors" 
            to="/"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Home
          </Link>
          <button 
            type="button"
            onClick={() => navigate('/register?role=customer')}
            className="rounded-xl bg-[#2F4DA0] hover:bg-blue-800 text-sm font-bold text-white px-5 py-2.5 transition-all active:scale-95 shadow-sm shadow-blue-900/10"
          >
            Sign Up
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.2em] text-[#2F4DA0]">{page.label}</p>
        <h1 className="mb-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{page.title}</h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-500 font-medium">{page.summary}</p>

        {/* 📋 Cleaned Card Grid Layout incorporating distinct visual structural identifiers */}
        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {page.items.map((item) => (
            <div 
              key={item.text} 
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300/80 flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-[#2F4DA0] flex items-center justify-center transition-colors border border-slate-100">
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
              </div>
              <p className="text-sm leading-relaxed font-medium text-slate-600 group-hover:text-slate-700 transition-colors">
                {item.text}
              </p>
            </div>
          ))}
        </section>

        {/* Support Section card option */}
        <section className="mt-12 rounded-2xl bg-[#2F4DA0] p-6 text-white sm:p-8 shadow-lg shadow-blue-900/10 relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined">support_agent</span> Contact LankaServe Support
          </h2>
          <div className="grid gap-3 text-blue-100 sm:grid-cols-3 text-xs font-bold">
            <a 
              className="rounded-xl bg-white/10 px-4 py-3.5 hover:bg-white/15 transition-colors flex items-center gap-2 border border-white/5" 
              href={`mailto:${contact.email}`}
            >
              <span className="material-symbols-outlined text-sm">mail</span>
              {contact.email}
            </a>
            <a 
              className="rounded-xl bg-white/10 px-4 py-3.5 hover:bg-white/15 transition-colors flex items-center gap-2 border border-white/5" 
              href={`https://github.com/${contact.github}`} 
              rel="noreferrer" 
              target="_blank"
            >
              <span className="material-symbols-outlined text-sm">code</span>
              github.com/{contact.github}
            </a>
            <a 
              className="rounded-xl bg-white/10 px-4 py-3.5 hover:bg-white/15 transition-colors flex items-center gap-2 border border-white/5" 
              href={whatsappUrl} 
              rel="noreferrer" 
              target="_blank"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              WhatsApp Connect
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}