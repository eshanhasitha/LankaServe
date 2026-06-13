import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getInitialLandingLanguage,
  landingCopy,
  languageOptions,
  languageStorageKey,
  stepIcons,
  testimonialImages,
  testimonialReviews,
  type LanguageCode,
} from './landing-i18n.ts';

// 🎯 Premium authentic trade stock photography links
const unifiedCategoryImages = [
  'https://plus.unsplash.com/premium_photo-1681839936471-f26e8512509b?q=80&w=600&auto=format&fit=crop', // Electrician
  'https://plus.unsplash.com/premium_photo-1663013675008-bd5a7898ac4f?q=80&w=600&auto=format&fit=crop', // Plumber
  'https://plus.unsplash.com/premium_photo-1682148536461-9d7515220528?q=80&w=600&auto=format&fit=crop', // Carpenter
];

function BrandLogo({ inFooter = false }: { inFooter?: boolean }) {
  const tileClasses = inFooter
    ? 'bg-white text-[#2F4DA0]'
    : 'bg-[#2F4DA0] text-white';

  const textClasses = inFooter
    ? 'text-white'
    : 'text-[#2F4DA0]';

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center shadow-sm ${tileClasses}`}>
        <span
          className="material-symbols-outlined text-[30px] leading-none"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 48" }}
        >
          handshake
        </span>
      </div>
      <span className={`text-[28px] leading-none font-bold tracking-tight ${textClasses}`}>LankaServe</span>
    </div>
  );
}

const navButtonBase =
  'inline-flex h-11 min-w-[104px] items-center justify-center rounded-xl border-2 px-5 text-sm font-bold transition-all';

const contactEmail = 'eshanhasitha55@gmail.com';
const githubUsername = 'eshanhasitha';
const whatsappNumber = '+94774506950';
const whatsappUrl = `https://wa.me/${whatsappNumber.replace('+', '')}`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<LanguageCode>(getInitialLandingLanguage);
  const [languageOpen, setLanguageOpen] = useState(false);
  const t = landingCopy[language];

  // 🎯 Search Input and Dropdown Menu State Handlers
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // 📱 QR Verification System Simulator Perspective Toggle State
  const [activeSimView, setActiveSimView] = useState<'customer' | 'provider'>('provider');

  // 💰 Dual Approval System Interactive Simulator State Tracker
  const [approvalStep, setApprovalStep] = useState<1 | 2 | 3>(1);

  // 🗣️ Testimonials Carousel Navigation State Handlers
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // ⚡ Live System Activity Ticker Data Stream Array
  const activityStream = useMemo(() => [
    { text: 'Electrician checked-in safely', location: 'Colombo 03', time: 'Just now', icon: 'verified' },
    { text: 'Plumbing emergency request matched', location: 'Kandy City', time: '2 mins ago', icon: 'bolt' },
    { text: 'Carpentry job completion confirmed', location: 'Galle Fort', time: '5 mins ago', icon: 'lock_open' },
    { text: 'AC Technician identity verified via QR', location: 'Kurunegala', time: '12 mins ago', icon: 'qr_code_2' },
    { text: 'Verified painter arrived at location', location: 'Jaffna', time: '15 mins ago', icon: 'construction' }
  ], []);

  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Automatically cycle through the real-time events smoothly every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); // Trigger fade out
      setTimeout(() => {
        setCurrentActivityIndex((prevIndex) => (prevIndex + 1) % activityStream.length);
        setFade(true); // Trigger fade in
      }, 500); 
    }, 4000);

    return () => clearInterval(interval);
  }, [activityStream]);

  // Automated background slider rotation loop for customer reviews
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonialReviews.length);
    }, 6000);
    return () => clearInterval(slideInterval);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  function selectLanguage(nextLanguage: LanguageCode) {
    setLanguage(nextLanguage);
    setLanguageOpen(false);
  }

  // 🔍 Filter matching services based on the active language dictionary data array
  const filteredServices = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return t.categories.items.filter((item) =>
      item.title.toLowerCase().includes(term)
    );
  }, [query, t.categories.items]);

  // Carousel manual shifting directional controllers
  function handlePrevReview() {
    setTestimonialIndex((prev) => (prev - 1 + testimonialReviews.length) % testimonialReviews.length);
  }

  function handleNextReview() {
    setTestimonialIndex((prev) => (prev + 1) % testimonialReviews.length);
  }

  return (
    <div className="scroll-smooth bg-white text-slate-900">
      {/* Dynamic Keyframe Injection for Scanner Laser Beam effect */}
      <style>{`
        @keyframes customLaserScan {
          0%, 100% { top: 6px; opacity: 0.2; }
          50% { top: 96px; opacity: 1; }
        }
        .animate-laserScan {
          animation: customLaserScan 2.2s infinite ease-in-out;
        }
      `}</style>

      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <BrandLogo />
            <div className="hidden md:flex items-center space-x-8">
              <a className="font-medium hover:text-blue-900 transition-colors" href="#home">{t.nav.home}</a>
              <a className="font-medium hover:text-blue-900 transition-colors" href="#categories">{t.nav.services}</a>
              <a className="font-medium hover:text-blue-900 transition-colors" href="#how-it-works">{t.nav.howItWorks}</a>
              <a className="font-medium hover:text-blue-900 transition-colors" href="#about">{t.nav.about}</a>
              <div className="relative">
                <button
                  aria-expanded={languageOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-1 rounded-xl px-2.5 py-2 hover:bg-blue-50 hover:text-blue-900 transition-colors"
                  type="button"
                  onClick={() => setLanguageOpen((open) => !open)}
                >
                  <span className="material-symbols-outlined text-xl">language</span>
                  <span className="font-medium">{language.toUpperCase()}</span>
                  <span className={`material-symbols-outlined text-sm transition-transform ${languageOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {languageOpen && (
                  <div className="absolute right-0 top-full mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl" role="menu">
                    {languageOptions.map((option) => (
                      <button
                        key={option.code}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold transition-colors ${
                          language === option.code ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-900'
                        }`}
                        role="menuitem"
                        type="button"
                        onClick={() => selectLanguage(option.code)}
                      >
                        <span>{option.label}</span>
                        <span className="text-xs font-medium">{option.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Link className={`${navButtonBase} border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white!`} to="/login">{t.nav.login}</Link>
              <Link className={`${navButtonBase} border-blue-900 bg-blue-900 text-white! hover:bg-blue-800 hover:border-blue-800`} to="/register">{t.nav.signUp}</Link>
            </div>
            <div className="sm:hidden">
              <Link className={`${navButtonBase} min-w-[88px] h-10 px-4 border-blue-900 bg-blue-900 text-white! hover:bg-blue-800 hover:border-blue-800`} to="/login">
                {t.nav.login}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-slate-50 py-20 lg:py-32" id="home">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1]">
                {t.hero.titleStart} <span className="text-blue-900">{t.hero.titleAccent}</span> {t.hero.titleEnd}
              </h1>
              <p className="text-lg text-slate-600 max-w-lg">
                {t.hero.summary}
              </p>
              
              {/* 🔍 Interactive Search Input Container */}
              <div className="relative max-w-md group flex flex-col z-30">
                <div className="relative w-full flex items-center">
                  <span className="absolute left-4 flex items-center pointer-events-none z-10 text-slate-500 group-focus-within:text-blue-900">
                    <span className="material-symbols-outlined text-2xl">search</span>
                  </span>
                  <input 
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none text-sm font-medium" 
                    placeholder={t.hero.search} 
                    type="text" 
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                </div>

                {/* 🎯 Real-Time Autocomplete Category Dropdown */}
                {showDropdown && query.trim() && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((category) => (
                          <button
                            key={category.title}
                            type="button"
                            onClick={() => navigate('/register?role=customer')}
                            className="w-full text-left px-5 py-3.5 text-sm font-bold text-slate-700 border-b border-slate-100 last:border-0 hover:bg-blue-50 hover:text-blue-900 transition-colors flex items-center justify-between"
                          >
                            <span>{category.title}</span>
                            <span className="material-symbols-outlined text-slate-400 text-sm">arrow_forward_ios</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-xs text-slate-400 font-medium italic text-center">
                          No matching services available.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <button 
                  className="flex items-center gap-2 px-8 py-4 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/20" 
                  type="button"
                  onClick={() => {
                    if (query.trim()) {
                      setShowDropdown(true);
                    } else {
                      navigate('/register?role=customer');
                    }
                  }}
                >
                  {t.hero.findServices} <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button 
                  type="button"
                  onClick={() => navigate('/register?role=provider')}
                  className="flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
                >
                  {t.hero.becomeProvider} <span className="material-symbols-outlined">person_add</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-slate-200 overflow-hidden shadow-2xl">
                <img alt="Service Worker Representative" className="w-full h-full object-cover mix-blend-multiply opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVp5BaHZEV4pEoJzibIAsvqjRucQLPBfJaLn9tlk8mIOe68siP2VU8RYSj8hO7U4GNS6Jd19ojZFnOnmj7EgpGHcHUtSgpxHRW0b-VtQK7Fuq9O2C_qLFStcWDkNRAPQ9FTqxGGwFLfFXq3DR8hU-ZLJpczSq9XYqhuo_Sify5e0bhSzE8pYkZ042tKWVf_97QiFFctGvHuq7_wc6Shr5qOjkTjCCby4rapR_Ka_kn5MvjFh1TE6tpoHN0uUyVdhSHp0BEYr_l6zB0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-8xl text-slate-400 opacity-50">engineering</span>
                </div>
              </div>

              {/* ⚡ Custom Live Activity Ticker Widget */}
              <div className="absolute -bottom-6 left-6 right-6 md:-left-6 md:right-auto bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-100 max-w-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl flex items-center justify-center shrink-0 animate-pulse">
                    <span className="material-symbols-outlined text-xl">
                      {activityStream[currentActivityIndex].icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">LankaServe Live Activity</p>
                    </div>
                    <div className={`transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
                      <p className="text-sm font-bold text-slate-900 leading-tight mb-0.5 truncate">
                        {activityStream[currentActivityIndex].text}
                      </p>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <span>📍 {activityStream[currentActivityIndex].location}</span>
                        <span className="text-slate-300">•</span>
                        <span>{activityStream[currentActivityIndex].time}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 🛠️ Popular Categories Grid Section */}
      <section className="py-24 bg-white" id="categories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t.categories.title}</h2>
            <div className="h-1.5 w-20 bg-blue-900 mx-auto rounded-full" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {t.categories.items.map((category, index) => (
              <div key={category.title} className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                
                {/* 📸 Clickable Image wrapper */}
                <div 
                  className="h-56 bg-slate-100 overflow-hidden relative cursor-pointer"
                  onClick={() => navigate('/register?role=customer')}
                >
                  <img 
                    alt={category.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    src={unifiedCategoryImages[index]}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                </div>

                <div className="p-8">
                  <h3 className="text-xl font-bold mb-3">{category.title}</h3>
                  <p className="text-slate-600 leading-relaxed h-12 line-clamp-2 mb-0">{category.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 🎯 Centralized "View All Services" Button Row */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/register?role=customer')}
              className="flex items-center gap-2 px-10 py-4 border-2 border-blue-900 text-blue-900 font-bold rounded-xl hover:bg-blue-900 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer outline-none text-sm"
            >
              <span>View All Available Services</span>
              <span className="material-symbols-outlined text-lg">apps</span>
            </button>
          </div>

        </div>
      </section>

      <section className="py-24 bg-slate-50 overflow-hidden" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-4xl font-extrabold mb-12 text-slate-900">{t.how.title}</h2>
              <div className="relative">
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200" />
                {t.how.steps.map((step, index) => (
                  <div key={step.title} className={`relative flex items-start gap-8 ${index === t.how.steps.length - 1 ? '' : 'mb-12'}`}>
                    <div className="shrink-0 w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center z-10 shadow-lg shadow-blue-900/30">
                      <span className="material-symbols-outlined">{stepIcons[index]}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-slate-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
                <img alt="Process Illustration" className="rounded-2xl w-full h-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvRYkHtmFDemOpKi3BhMKKGvMCK8DgLdaQL8apH5LtV4D8nJelOPMIPGPDtmIOAs4mHrTtgDZ6KcH86aymg8Qsg3pmmWPIOF2vXpIcQ0GxJBbDT8bQUllp0C4D9xlgeKoja-_4txXlIn1MkT3o3KnJymi-bhL3sQFKFRf19wCTQ9BTE1Zp3DmPIWZU9Hrgsqp50rzceBrld8aWwtHDZPCv4PKLvlfBwyuZM1TP0uTkydS6DTRLRMIvcad6vKqyDTZ2SZffGqbmsbld" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🛡️ Advanced QR-Based Verification System Section */}
      <section className="py-24 bg-white" id="qr-security">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* 📱 Left Column: Real Application Mirror UI Interface Simulator */}
            <div className="relative flex flex-col items-center">
              
              {/* Perspective Control Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6 shadow-inner border border-slate-200/60 z-10">
                <button
                  type="button"
                  onClick={() => setActiveSimView('provider')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeSimView === 'provider'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">engineering</span>
                  Provider Active QR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSimView('customer')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeSimView === 'customer'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                  Customer Scan View
                </button>
              </div>

              {/* Smartphone Chassis Frame */}
              <div className="w-[288px] h-[550px] bg-slate-950 rounded-[42px] p-3 shadow-2xl border-4 border-slate-800 relative ring-1 ring-slate-900/10 transition-all duration-500 hover:scale-[1.02]">
                
                {/* Speaker Notch island top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-24 bg-slate-950 rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-8 h-0.5 bg-slate-800 rounded-full mb-0.5" />
                </div>

                {/* Smartphone Internal Core Screen */}
                <div className="w-full h-full bg-[#F5F7FA] rounded-[32px] overflow-hidden relative flex flex-col font-sans select-none border border-slate-900/5">
                  
                  {/* Header Layout */}
                  <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-3 flex items-center justify-between shrink-0 shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-700 text-base font-bold">arrow_back</span>
                      <span className="text-xs font-bold text-slate-800 tracking-tight">Job Details</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-700 text-base font-bold">more_horiz</span>
                  </div>

                  {/* SIMULATED VIEW A: GENUINE PROVIDER QR TOKEN OVERLAY */}
                  {activeSimView === 'provider' ? (
                    <div className="flex-1 p-3 flex flex-col justify-between overflow-y-auto">
                      
                      <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-semibold text-slate-500 text-center mt-1">
                          Show this code to the customer<br />upon arrival
                        </p>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col items-center">
                          <div className="w-full border border-dashed border-slate-200 p-3 rounded-xl flex flex-col items-center">
                            
                            <div className="w-24 h-24 bg-white p-1 flex items-center justify-center border border-slate-100 shadow-2xs rounded-lg mb-2">
                              <span className="material-symbols-outlined text-5xl text-slate-800 tracking-tighter">qr_code_2</span>
                            </div>
                            
                            <p className="text-[8px] font-bold tracking-widest text-slate-400 uppercase mb-3">Scan For Verification</p>
                            
                            <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Provider</p>
                            <p className="text-[9px] text-slate-400 font-bold">Plumbing</p>
                          </div>

                          <button type="button" className="w-full bg-[#2F4DA0] hover:bg-blue-800 text-white mt-3 py-2 rounded-xl text-[9px] font-bold shadow-xs flex items-center justify-center gap-1 transition-colors">
                            <span className="material-symbols-outlined text-xs">refresh</span> Refresh Code
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-300/60 rounded-xl py-2 px-4 text-center text-[10px] font-bold text-slate-500 tracking-tight select-none mb-1">
                        Confirm Job Completion
                      </div>

                    </div>
                  ) : (
                    /* SIMULATED VIEW B: GENUINE CUSTOMER STATUS INTERFACE */
                    <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto justify-between">
                      
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-3 h-3 rounded-full border border-slate-300 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /></div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-700 leading-tight">Job Completed</p>
                            <p className="text-[8px] text-slate-400 font-medium">Awaiting confirmation</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white px-2.5 py-2 rounded-xl border border-slate-200/50 shadow-2xs">
                            <p className="text-[8px] font-bold text-slate-700 flex items-center gap-0.5 mb-0.5">⏱️ Provider Status</p>
                            <p className="text-[8px] text-slate-400 font-semibold leading-tight">Awaiting provider completion.</p>
                          </div>
                          <div className="bg-white px-2.5 py-2 rounded-xl border border-slate-200/50 shadow-2xs">
                            <p className="text-[8px] font-bold text-slate-700 flex items-center gap-0.5 mb-0.5">⏱️ Your Status</p>
                            <p className="text-[8px] text-slate-400 font-semibold leading-tight">Waiting for provider.</p>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/50 shadow-2xs flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2F4DA0] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-sm font-bold">location_on</span>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-800 leading-none mb-0.5">Location</p>
                            <p className="text-[8px] font-mono font-bold text-slate-400 tracking-tight leading-none">7.29312, 80.63504</p>
                          </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col items-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-3xs mb-2 relative">
                            <span className="material-symbols-outlined text-lg text-slate-700">qr_code_2</span>
                            <div className="absolute left-0.5 right-0.5 h-0.5 bg-[#2F4DA0] shadow-[0_0_4px_#2F4DA0] animate-laserScan" />
                          </div>
                          
                          <p className="text-[10px] font-extrabold text-blue-950/90 mb-1">QR Verification Required</p>
                          <p className="text-[8px] text-slate-400 font-semibold text-center leading-normal mb-3 max-w-[160px]">
                            Ensure the provider is at your location before scanning their QR code.
                          </p>

                          <button type="button" className="w-full bg-[#2F4DA0] hover:bg-blue-800 text-white py-2 rounded-xl text-[9px] font-bold shadow-xs flex items-center justify-center gap-1 transition-colors">
                            <span className="material-symbols-outlined text-xs">qr_code_scanner</span> Scan QR to Confirm Arrival
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-300/60 rounded-xl py-2 px-4 text-center text-[10px] font-bold text-slate-500 tracking-tight select-none mb-1">
                        Confirm Job Completion
                      </div>

                    </div>
                  )}

                  {/* Real Mobile App Navigation Bottom Bar Layout Mirror */}
                  {activeSimView === 'provider' ? (
                    <div className="bg-white border-t border-slate-100 px-2 py-2 flex justify-between items-center text-slate-400 shrink-0 text-center">
                      <div className="flex-1 flex flex-col items-center">
                        <span className="material-symbols-outlined text-base">grid_view</span>
                        <span className="text-[7px] font-medium mt-0.5 scale-90 whitespace-nowrap">Dashboard</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="material-symbols-outlined text-base">travel_explore</span>
                        <span className="text-[7px] font-medium mt-0.5 scale-90 whitespace-nowrap">Browse Jobs</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center text-[#2F4DA0]">
                        <span className="material-symbols-outlined text-base">business_center</span>
                        <span className="text-[7px] font-bold mt-0.5 scale-90 whitespace-nowrap">Jobs</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="material-symbols-outlined text-base">payments</span>
                        <span className="text-[7px] font-medium mt-0.5 scale-90 whitespace-nowrap">Earnings</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span className="text-[7px] font-medium mt-0.5 scale-90 whitespace-nowrap">Messages</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border-t border-slate-100 px-3 py-2 flex justify-between items-center text-slate-400 shrink-0 relative">
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-base">home</span>
                        <span className="text-[8px] font-medium mt-0.5">Home</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-base">search</span>
                        <span className="text-[8px] font-medium mt-0.5">Search</span>
                      </div>
                      
                      <div className="w-11 h-11 bg-[#2F4DA0] rounded-full text-white flex items-center justify-center shadow-lg -translate-y-4 border-4 border-white absolute left-1/2 -translate-x-1/2">
                        <span className="material-symbols-outlined text-lg font-bold">qr_code_scanner</span>
                      </div>
                      <div className="w-10 h-4" /> 

                      <div className="flex flex-col items-center text-[#2F4DA0]">
                        <span className="material-symbols-outlined text-base">business_center</span>
                        <span className="text-[8px] font-bold mt-0.5">Jobs</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span className="text-[8px] font-medium mt-0.5">Messages</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* 📋 Right Column: Copywriting Explainer Segment */}
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-900 rounded-full text-sm font-bold mb-6">
                <span className="material-symbols-outlined text-sm mr-2">security</span> {t.qr.badge}
              </div>
              <h2 className="text-4xl font-extrabold mb-6 leading-tight text-slate-900">{t.qr.title}</h2>
              <p className="text-lg text-slate-600 mb-8">
                {t.qr.summary}
              </p>
              <ul className="space-y-4">
                {t.qr.checks.map((item) => (
                  <li key={item} className="flex items-center gap-3 group">
                    <span className="material-symbols-outlined text-emerald-500 group-hover:scale-110 transition-transform">check_circle</span>
                    <span className="font-semibold text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* 🤝 Dual Approval System Section */}
      <section className="py-24 bg-slate-50" id="dual-approval">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold mb-6">
                <span className="material-symbols-outlined text-sm mr-2">verified_user</span> {t.approval.badge}
              </div>
              <h2 className="text-4xl font-extrabold mb-6 leading-tight">{t.approval.title}</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t.approval.summary}
              </p>
              <button 
                className="font-bold text-blue-900 flex items-center hover:gap-2 transition-all bg-transparent border-none outline-none cursor-pointer" 
                type="button"
                onClick={() => navigate('/register?role=customer')}
              >
                {t.approval.learn} <span className="material-symbols-outlined ml-2">arrow_forward</span>
              </button>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-slate-200/50 max-w-md mx-auto transition-all duration-300 hover:shadow-2xl">
                
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escrow Flow Sandbox</span>
                  <button 
                    type="button" 
                    onClick={() => setApprovalStep(1)}
                    className="text-[10px] font-bold text-[#2F4DA0] hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-xs">restart_alt</span> Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 relative">
                  
                  <div className={`p-4 rounded-2xl text-center transition-all duration-300 border ${
                    approvalStep === 3 
                      ? 'bg-emerald-50/50 border-emerald-200 shadow-xs' 
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`material-symbols-outlined text-3xl mb-2 transition-colors ${approvalStep === 3 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      person
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.approval.customer}</p>
                    
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${approvalStep === 3 ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`} />
                      <p className="text-xs font-bold text-slate-800">
                        {approvalStep === 3 ? t.approval.confirmed : 'Pending Approval'}
                      </p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl text-center transition-all duration-300 border ${
                    approvalStep >= 2 
                      ? 'bg-emerald-50/50 border-emerald-200 shadow-xs' 
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`material-symbols-outlined text-3xl mb-2 transition-colors ${approvalStep >= 2 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      construction
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.approval.provider}</p>
                    
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${approvalStep >= 2 ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`} />
                      <p className="text-xs font-bold text-slate-800">
                        {approvalStep >= 2 ? t.approval.confirmed : 'Pending Sign-off'}
                      </p>
                    </div>
                  </div>

                </div>

                <div className="mt-6">
                  {approvalStep === 1 && (
                    <button
                      type="button"
                      onClick={() => setApprovalStep(2)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                    >
                      <span className="material-symbols-outlined text-base text-blue-400">hvac</span>
                      Step 1: Simulate Provider Job Completion
                    </button>
                  )}

                  {approvalStep === 2 && (
                    <button
                      type="button"
                      onClick={() => setApprovalStep(3)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 animate-pulse"
                    >
                      <span className="material-symbols-outlined text-base text-emerald-400">verified</span>
                      Step 2: Simulate Customer Safe Release
                    </button>
                  )}

                  {approvalStep === 3 && (
                    <div className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 tracking-wide animate-fadeIn">
                      <span className="material-symbols-outlined text-base">lock_open</span>
                      {t.approval.released} Successfully!
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 text-center mt-3 font-medium leading-relaxed">
                  🛡️ Funds are held completely secure inside LankaServe Escrow Vault contracts.<br />No payments are ever processed unilaterally.
                </p>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 🗣️ What Our Customers Say Section (Updated to Live Dynamic Slide Carousel) */}
      <section className="py-24 bg-white overflow-hidden" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-extrabold mb-4">{t.testimonials.title}</h2>
              <p className="text-slate-600">{t.testimonials.subtitle}</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handlePrevReview}
                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 active:scale-90 transition-all cursor-pointer outline-none" 
                type="button"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button 
                onClick={handleNextReview}
                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 active:scale-90 transition-all cursor-pointer outline-none" 
                type="button"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Single Focused, Premium Testimonial Card Frame */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-50 p-8 md:p-12 rounded-3xl border border-slate-200/50 shadow-xs relative transition-all duration-500 ease-in-out">
              {/* Giant Decorative Quote Graphic icon marker */}
              <span className="material-symbols-outlined text-blue-900/10 text-7xl font-bold absolute left-6 top-4 select-none pointer-events-none">
                format_quote
              </span>
              
              <div className="flex text-yellow-400 mb-6 relative z-10">
                <span className="material-symbols-outlined text-xl">star</span>
                <span className="material-symbols-outlined text-xl">star</span>
                <span className="material-symbols-outlined text-xl">star</span>
                <span className="material-symbols-outlined text-xl">star</span>
                <span className="material-symbols-outlined text-xl">star</span>
              </div>
              
              <p className="text-slate-700 italic text-lg md:text-xl leading-relaxed mb-8 relative z-10 font-medium">
                "{t.testimonials.items[testimonialIndex].quote}"
              </p>
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/60 pt-6">
                <div className="flex items-center gap-4">
                  {/* Dynamic Color Profile Initials circle layout fallback block */}
                  <div className="w-12 h-12 rounded-full bg-[#2F4DA0] text-white font-extrabold flex items-center justify-center text-sm tracking-wide shadow-sm shrink-0 uppercase select-none">
                    {t.testimonials.items[testimonialIndex].name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-base">{t.testimonials.items[testimonialIndex].name}</p>
                    <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <span>📍 {t.testimonials.items[testimonialIndex].city}</span>
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                  <span className="material-symbols-outlined text-sm font-bold">verified</span>
                  <span>Verified Booking</span>
                </div>
              </div>
            </div>

            {/* Slider Track Position Indicator Bullets Row */}
            <div className="flex justify-center gap-2 mt-6">
              {t.testimonials.items.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setTestimonialIndex(dotIdx)}
                  className={`h-2.5 rounded-full transition-all duration-300 outline-none border-none ${
                    testimonialIndex === dotIdx ? 'w-6 bg-[#2F4DA0]' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      <footer className="bg-blue-900 text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 mb-20">
            <div className="lg:col-span-2 space-y-6">
              <BrandLogo inFooter />
              <p className="text-blue-100 max-w-sm leading-relaxed">
                {t.footer.description}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">{t.footer.quickLinks}</h4>
              <ul className="space-y-4 text-blue-100">
                <li><Link className="hover:text-white transition-colors" to="/register?role=customer">{t.footer.links[0]}</Link></li>
                <li><Link className="hover:text-white transition-colors" to="/register?role=provider">{t.footer.links[1]}</Link></li>
                <li><a className="hover:text-white transition-colors" href="#how-it-works">{t.footer.links[2]}</a></li>
                <li><Link className="hover:text-white transition-colors" to="/register?role=customer">{t.footer.links[3]}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">{t.footer.support}</h4>
              <ul className="space-y-4 text-blue-100">
                <li><Link className="hover:text-white transition-colors" to="/privacy">{t.footer.supportLinks[0]}</Link></li>
                <li><Link className="hover:text-white transition-colors" to="/safety-guide">{t.footer.supportLinks[1]}</Link></li>
                <li><Link className="hover:text-white transition-colors" to="/contact">{t.footer.supportLinks[2]}</Link></li>
                <li><Link className="hover:text-white transition-colors" to="/terms">{t.footer.supportLinks[3]}</Link></li>
              </ul>
            </div>
            <div className="lg:col-span-1">
              <h4 className="font-bold text-lg mb-6">{t.footer.contact}</h4>
              <ul className="space-y-4 text-blue-100">
                <li><a className="hover:text-white transition-colors" href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
                <li><a className="hover:text-white transition-colors" href={`https://github.com/${githubUsername}`} rel="noreferrer" target="_blank">{t.footer.github}: {githubUsername}</a></li>
                <li><a className="hover:text-white transition-colors" href={whatsappUrl} rel="noreferrer" target="_blank">{t.footer.whatsapp}: {whatsappNumber}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-200">
            <p>{t.footer.copyright}</p>
            <div className="flex gap-8">
              <Link className="hover:text-white" to="/privacy">{t.footer.privacy}</Link>
              <Link className="hover:text-white" to="/terms">{t.footer.terms}</Link>
              <Link className="hover:text-white" to="/cookies">{t.footer.cookies}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}