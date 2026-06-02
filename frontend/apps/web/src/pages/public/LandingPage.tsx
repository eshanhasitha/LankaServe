import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  categoryImages,
  getInitialLandingLanguage,
  landingCopy,
  languageOptions,
  languageStorageKey,
  stepIcons,
  testimonialImages,
  testimonialReviews,
  type LanguageCode,
} from './landing-i18n.ts';

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
  const [language, setLanguage] = useState<LanguageCode>(getInitialLandingLanguage);
  const [languageOpen, setLanguageOpen] = useState(false);
  const t = landingCopy[language];

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  function selectLanguage(nextLanguage: LanguageCode) {
    setLanguage(nextLanguage);
    setLanguageOpen(false);
  }

  return (
    <div className="scroll-smooth bg-white text-slate-900">
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
              <div className="relative max-w-md group flex items-center">
                <span className="absolute left-4 flex items-center pointer-events-none z-10 text-slate-500 group-focus-within:text-blue-900">
                  <span className="material-symbols-outlined text-2xl">search</span>
                </span>
                <input className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none" placeholder={t.hero.search} type="text" />
              </div>
              <div className="flex flex-wrap gap-4">
                <button className="flex items-center gap-2 px-8 py-4 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/20" type="button">
                  {t.hero.findServices} <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <Link className="flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20" to="/register">
                  {t.hero.becomeProvider} <span className="material-symbols-outlined">person_add</span>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-slate-200 overflow-hidden shadow-2xl">
                <img alt="Service Worker Representative" className="w-full h-full object-cover mix-blend-multiply opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVp5BaHZEV4pEoJzibIAsvqjRucQLPBfJaLn9tlk8mIOe68siP2VU8RYSj8hO7U4GNS6Jd19ojZFnOnmj7EgpGHcHUtSgpxHRW0b-VtQK7Fuq9O2C_qLFStcWDkNRAPQ9FTqxGGwFLfFXq3DR8hU-ZLJpczSq9XYqhuo_Sify5e0bhSzE8pYkZ042tKWVf_97QiFFctGvHuq7_wc6Shr5qOjkTjCCby4rapR_Ka_kn5MvjFh1TE6tpoHN0uUyVdhSHp0BEYr_l6zB0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-8xl text-slate-400 opacity-50">engineering</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="material-symbols-outlined text-green-600">verified</span>
                  </div>
                  <span className="font-bold text-2xl">2.5k+</span>
                </div>
                <p className="text-sm text-slate-500 font-medium">{t.hero.verifiedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white" id="categories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t.categories.title}</h2>
            <div className="h-1.5 w-20 bg-blue-900 mx-auto rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {t.categories.items.map((category, index) => (
              <div key={category.title} className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-56 bg-slate-100 overflow-hidden relative">
                  <img alt={category.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={categoryImages[index]} />
                  <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold mb-3">{category.title}</h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">{category.description}</p>
                  <a className="inline-flex items-center font-bold text-blue-900 group-hover:translate-x-2 transition-transform" href="#categories">
                    {t.categories.viewMore} <span className="material-symbols-outlined ml-1">arrow_forward</span>
                  </a>
                </div>
              </div>
            ))}
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

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-video bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden">
                <img alt="QR Scan Demo" className="w-full h-full object-cover opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZSm-S2LOz7VSmvzUpfqVvx3cHq_OgM8M_sx9mAhItChGevTV3ksifG-fq-yJ_YXThGxu8MiFrWeldOpDKaCeJIUuQHxrFcPyzusvpc8VnC7Ja9ki5sZW-DPzhSPYrVDDB5XJyNvvWgQksdbx4CXQ2Sc9KTY302ZtGjjt-aPpTXfz9euOidIl5XNbKE4-9tiXE4fojgtomXoUVoVqZKjsWosaDz9FgFBOqUTbud8hOUSk73vL6eMeWnS0-nRMKM-wIWSukg8KaHMvq" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-6 rounded-2xl shadow-2xl animate-pulse">
                    <span className="material-symbols-outlined text-blue-900 text-8xl">qr_code_2</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-900 rounded-full text-sm font-bold mb-6">
                <span className="material-symbols-outlined text-sm mr-2">security</span> {t.qr.badge}
              </div>
              <h2 className="text-4xl font-extrabold mb-6 leading-tight">{t.qr.title}</h2>
              <p className="text-lg text-slate-600 mb-8">
                {t.qr.summary}
              </p>
              <ul className="space-y-4">
                {t.qr.checks.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50">
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
              <button className="font-bold text-blue-900 flex items-center hover:gap-2 transition-all" type="button">
                {t.approval.learn} <span className="material-symbols-outlined ml-2">arrow_forward</span>
              </button>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <span className="material-symbols-outlined text-4xl text-blue-900 mb-2">person</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.approval.customer}</p>
                    <p className="font-bold mt-1">{t.approval.confirmed}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">construction</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.approval.provider}</p>
                    <p className="font-bold mt-1">{t.approval.confirmed}</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-center p-4 bg-blue-900 rounded-xl text-white font-bold">
                  <span className="material-symbols-outlined mr-2">lock_open</span> {t.approval.released}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white overflow-hidden" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-extrabold mb-4">{t.testimonials.title}</h2>
              <p className="text-slate-600">{t.testimonials.subtitle}</p>
            </div>
            <div className="flex gap-4">
              <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors" type="button"><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors" type="button"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonialReviews.map((testimonial, index) => (
              <div key={testimonial.name} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex text-yellow-400 mb-6">
                  <span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">star</span>
                </div>
                <p className="text-slate-700 italic mb-8 leading-relaxed">&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden">
                    <img alt={testimonial.name} className="w-full h-full object-cover" src={testimonialImages[index]} />
                  </div>
                  <div>
                    <p className="font-bold">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.city}</p>
                  </div>
                </div>
              </div>
            ))}
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
                <li><Link className="hover:text-white transition-colors" to="/find-a-pro">{t.footer.links[0]}</Link></li>
                <li><Link className="hover:text-white transition-colors" to="/become-a-pro">{t.footer.links[1]}</Link></li>
                <li><Link className="hover:text-white transition-colors" to="/how-it-works">{t.footer.links[2]}</Link></li>
                <li><Link className="hover:text-white transition-colors" to="/service-areas">{t.footer.links[3]}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">{t.footer.support}</h4>
              <ul className="space-y-4 text-blue-100">
                <li><Link className="hover:text-white transition-colors" to="/help-center">{t.footer.supportLinks[0]}</Link></li>
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
