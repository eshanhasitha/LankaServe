import { Link } from 'react-router-dom';

const contact = {
  email: 'eshanhasitha55@gmail.com',
  github: 'eshanhasitha',
  whatsapp: '+94774506950',
};

const pages = {
  findPro: {
    title: 'Find a Pro',
    label: 'Quick Links',
    summary: 'Search verified LankaServe professionals by service category, location, rating, and availability.',
    items: ['Compare profiles and reviews before booking.', 'Use service categories to narrow down the right provider.', 'Confirm arrival with QR verification before work starts.'],
  },
  becomePro: {
    title: 'Become a Pro',
    label: 'Quick Links',
    summary: 'Register as a service provider and receive nearby service requests from customers in Sri Lanka.',
    items: ['Create your provider profile and choose a primary service category.', 'Manage incoming requests, accepted jobs, earnings, and QR verification.', 'Build trust through reviews, badges, and completion history.'],
  },
  howItWorks: {
    title: 'How LankaServe Works',
    label: 'Platform',
    summary: 'LankaServe connects customers and skilled providers through request posting, matching, QR verification, and completion confirmation.',
    items: ['Customers post service requests with a budget and location.', 'Providers accept relevant jobs and communicate through the platform.', 'Both sides confirm arrival and completion for a safer workflow.'],
  },
  serviceAreas: {
    title: 'Service Areas',
    label: 'Coverage',
    summary: 'LankaServe is designed for Sri Lankan cities and districts, starting with dense urban service areas.',
    items: ['Colombo and nearby suburbs are prioritized first.', 'Providers can define their preferred service area.', 'Heatmap views help customers see active demand and provider availability.'],
  },
  helpCenter: {
    title: 'Help Center',
    label: 'Support',
    summary: 'Get help with account access, bookings, provider registration, payments, and QR verification.',
    items: ['Email support for account or technical issues.', 'Use WhatsApp for urgent service flow problems.', 'Check safety guidance before allowing providers on site.'],
  },
  safetyGuide: {
    title: 'Safety Guide',
    label: 'Support',
    summary: 'Use LankaServe safety checks before a service provider starts work at your location.',
    items: ['Verify provider identity and job details in the app.', 'Scan the provider QR code only when they are physically on site.', 'Do not release completion confirmation until the service is done.'],
  },
  contact: {
    title: 'Contact Us',
    label: 'Support',
    summary: 'Reach the LankaServe team through the official support channels below.',
    items: [`Email: ${contact.email}`, `GitHub: ${contact.github}`, `WhatsApp: ${contact.whatsapp}`],
  },
  terms: {
    title: 'Terms of Service',
    label: 'Legal',
    summary: 'These terms outline the expected use of LankaServe by customers, providers, and administrators.',
    items: ['Customers must provide accurate job details and location information.', 'Providers must only accept work they are qualified to perform.', 'Misuse, fraud, harassment, and unsafe service behavior may result in account restrictions.'],
  },
  privacy: {
    title: 'Privacy Policy',
    label: 'Legal',
    summary: 'LankaServe uses account, job, location, and communication data to operate the marketplace safely.',
    items: ['Personal data is used for authentication, matching, messaging, and job management.', 'Location data supports service requests, provider discovery, and heatmap features.', 'Users can contact support to request help with privacy-related account concerns.'],
  },
  cookies: {
    title: 'Cookies Settings',
    label: 'Legal',
    summary: 'Cookie and local storage data help keep the web app signed in and improve basic platform reliability.',
    items: ['Authentication sessions may be stored locally in the browser.', 'Analytics and performance tools may be used to understand app reliability.', 'Browser settings can be used to clear local site data.'],
  },
};

export type PublicInfoPageKey = keyof typeof pages;

export default function PublicInfoPage({ pageKey }: { pageKey: PublicInfoPageKey }) {
  const page = pages[pageKey];
  const whatsappUrl = `https://wa.me/${contact.whatsapp.replace('+', '')}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-blue-900" to="/">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            Back to Home
          </Link>
          <Link className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-bold text-white!" to="/register">
            Sign Up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-blue-900">{page.label}</p>
        <h1 className="mb-5 text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">{page.title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-600">{page.summary}</p>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {page.items.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="leading-7 text-slate-700">{item}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-2xl bg-blue-900 p-6 text-white sm:p-8">
          <h2 className="mb-4 text-2xl font-bold">Contact LankaServe</h2>
          <div className="grid gap-3 text-blue-100 sm:grid-cols-3">
            <a className="rounded-xl bg-white/10 px-4 py-3 font-semibold hover:bg-white/15" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
            <a className="rounded-xl bg-white/10 px-4 py-3 font-semibold hover:bg-white/15" href={`https://github.com/${contact.github}`} rel="noreferrer" target="_blank">
              github.com/{contact.github}
            </a>
            <a className="rounded-xl bg-white/10 px-4 py-3 font-semibold hover:bg-white/15" href={whatsappUrl} rel="noreferrer" target="_blank">
              WhatsApp {contact.whatsapp}
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
