import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.tsx';
import { loginWithGooglePopup, registerWithEmailPassword } from '../../lib/firebase-client.ts';
import { SERVICE_CATEGORIES } from '../../lib/service-categories.ts';
import { notifyError } from '../../lib/toast.ts';
import {
  getInitialLandingLanguage,
  languageOptions,
  languageStorageKey,
  type LanguageCode,
} from './landing-i18n.ts';
import { authCopy } from './public-auth-i18n.ts';

const inputClass =
  'w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-[12px] text-sm text-[#111827] placeholder:text-slate-400 outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/10 transition-all duration-200';

const labelClass = 'block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2';

const DEFAULT_PROVIDER_LOCATION = {
  label: 'Colombo, Sri Lanka',
  district: 'Colombo',
  coordinates: [79.8612, 6.9271],
};

const FALLBACK_CITIES = [
  DEFAULT_PROVIDER_LOCATION,
  { label: 'Kandy, Sri Lanka', district: 'Kandy', coordinates: [80.6337, 7.2906] },
  { label: 'Galle, Sri Lanka', district: 'Galle', coordinates: [80.217, 6.0535] },
  { label: 'Jaffna, Sri Lanka', district: 'Jaffna', coordinates: [80.0255, 9.6615] },
  { label: 'Kurunegala, Sri Lanka', district: 'Kurunegala', coordinates: [80.3647, 7.4863] },
];

function mapSearchResult(item: any) {
  return {
    label: item.display_name,
    district:
      item.address?.city ||
      item.address?.town ||
      item.address?.state_district ||
      item.address?.county ||
      'Sri Lanka',
    coordinates: [Number(item.lon), Number(item.lat)],
  };
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const urlRole = searchParams.get('role');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  
  const [role, setRole] = useState(urlRole === 'provider' || urlRole === 'customer' ? urlRole : 'customer');
  
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [providerLocation, setProviderLocation] = useState<any>(null);
  const [locationSuggestions, setLocationSuggestions] = useState(FALLBACK_CITIES);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>(getInitialLandingLanguage);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const { loginWithToken, registerWithToken } = useAuth();
  const navigate = useNavigate();
  const copy = authCopy[language];

  useEffect(() => {
    if (urlRole === 'provider' || urlRole === 'customer') {
      setRole(urlRole);
    }
  }, [urlRole]);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  const fallbackSuggestions = useMemo(() => {
    const query = serviceArea.trim().toLowerCase();
    if (!query) return FALLBACK_CITIES;
    return FALLBACK_CITIES.filter((city) =>
      city.label.toLowerCase().includes(query) || city.district.toLowerCase().includes(query)
    );
  }, [serviceArea]);

  useEffect(() => {
    if (role !== 'provider') return undefined;

    const query = serviceArea.trim();
    if (query.length < 2) {
      setLocationSuggestions(fallbackSuggestions);
      setLocationLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setLocationLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=lk&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }
        );

        if (!response.ok) throw new Error(copy.register.errors.locationSearch);
        const payload = await response.json();
        const mapped = Array.isArray(payload) ? payload.map(mapSearchResult) : [];
        setLocationSuggestions(mapped.length ? mapped : fallbackSuggestions);
      } catch (loadError: any) {
        if (loadError.name !== 'AbortError') {
          setLocationSuggestions(fallbackSuggestions);
        }
      } finally {
        setLocationLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [copy.register.errors.locationSearch, fallbackSuggestions, role, serviceArea]);

  function applyProviderLocation(location: any) {
    setProviderLocation(location);
    setServiceArea(location.label);
    setShowLocationSuggestions(false);
  }

  const providerProfile = useMemo(() => (
    role === 'provider' && providerLocation
      ? {
          categories: serviceCategory ? [serviceCategory] : ['Other'],
          bio: serviceArea.trim(),
          serviceArea: serviceArea.trim(),
          yearsExperience: 0,
          location: { type: 'Point', coordinates: providerLocation.coordinates },
        }
      : undefined
  ), [providerLocation, role, serviceArea, serviceCategory]);

  async function onSubmit(event: any) {
    event.preventDefault();
    if (busy) return; 
    setPasswordMismatch(false); 
    setBusy(true);
    try {
      if (!fullName.trim()) throw new Error(copy.register.errors.fullName);
      if (!email.trim()) throw new Error(copy.register.errors.email);
      
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) throw new Error(copy.register.errors.validEmail);
      if (!email.trim().endsWith('@gmail.com')) throw new Error(copy.register.errors.gmail);
      if (!phoneNumber.trim()) throw new Error(copy.register.errors.phone);
      if (!address.trim()) throw new Error(copy.register.errors.address);
      
      if (!password) throw new Error('Please enter a password.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
      if (password !== confirmPassword) {
        setPasswordMismatch(true); 
        throw new Error(copy.register.errors.passwordMatch);
      }
      
      if (!agreeTerms) throw new Error(copy.register.errors.terms);
      if (role === 'provider' && !serviceCategory) throw new Error(copy.register.errors.category);
      if (role === 'provider' && !serviceArea.trim()) throw new Error(copy.register.errors.serviceArea);
      if (role === 'provider' && !providerLocation) throw new Error('Please select a valid location from the suggestions dropdown.');
      
      const token = await registerWithEmailPassword(email.trim(), password, fullName.trim());
      await registerWithToken(token, role, providerProfile);
      navigate(role === 'provider' ? '/provider/dashboard' : '/customer/dashboard', { replace: true });
    } catch (submitError: any) {
      notifyError(submitError.message || copy.register.errors.failed);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleSignup() {
    if (busy) return; 
    setBusy(true);
    try {
      if (!agreeTerms) throw new Error(copy.register.errors.terms);
      const token = await loginWithGooglePopup();
      try {
        await registerWithToken(token, role, providerProfile);
      } catch (registerError: any) {
        if (!String(registerError.message).toLowerCase().includes('already exists')) throw registerError;
        await loginWithToken(token);
      }
      navigate(role === 'provider' ? '/provider/dashboard' : '/customer/dashboard', { replace: true });
    } catch (signupError: any) {
      if (signupError?.code === 'auth/popup-closed-by-user' || signupError?.message?.includes('popup-closed-by-user')) {
        return; 
      }
      notifyError(signupError.message || copy.register.errors.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-h-screen flex flex-col bg-[#F8FAFC] font-['Inter'] p-4 md:p-8">
      {/* Navigation Layer */}
      <div className="w-full max-w-5xl mx-auto flex justify-between items-center mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-xs text-xs font-bold text-slate-600 hover:text-[#2F4DA0] hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Home
        </button>

        <div className="flex items-center overflow-hidden rounded-full bg-white px-1 py-1 border border-slate-200 shadow-xs">
          {languageOptions.map((option, index) => (
            <div key={option.code} className="flex items-center">
              {index > 0 && <div className="w-px h-3 bg-slate-200" />}
              <button
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  language === option.code ? 'text-[#2F4DA0] bg-blue-50/60' : 'text-slate-400 hover:text-slate-600'
                }`}
                type="button"
                onClick={() => setLanguage(option.code)}
              >
                {option.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <main className="grow flex items-center justify-center px-2">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 p-8 md:p-10 transition-all duration-300">
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 bg-[#2F4DA0] text-white rounded-2xl flex items-center justify-center shadow-md mb-4 animate-pulse">
              <span className="material-symbols-outlined text-3xl font-bold">handshake</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">{copy.register.title}</h1>
            <p className="text-sm font-medium text-slate-400">{copy.register.subtitle}</p>
          </div>

          {/* 🎯 Premium Role Selector Cards Replacement */}
          <div className="mb-6">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">
              {copy.register.roleLabel}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`flex flex-col items-center justify-center p-5 border-2 rounded-2xl transition-all duration-300 group cursor-pointer ${
                  role === 'customer'
                    ? 'border-[#2F4DA0] bg-blue-50/40 shadow-xs'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${role === 'customer' ? 'bg-[#2F4DA0] text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
                <span className={`text-xs font-bold tracking-wide uppercase ${role === 'customer' ? 'text-[#2F4DA0]' : 'text-slate-500'}`}>
                  {copy.register.customer}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`flex flex-col items-center justify-center p-5 border-2 rounded-2xl transition-all duration-300 group cursor-pointer ${
                  role === 'provider'
                    ? 'border-[#2F4DA0] bg-blue-50/40 shadow-xs'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${role === 'provider' ? 'bg-[#2F4DA0] text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                  <span className="material-symbols-outlined text-xl">construction</span>
                </div>
                <span className={`text-xs font-bold tracking-wide uppercase ${role === 'provider' ? 'text-[#2F4DA0]' : 'text-slate-500'}`}>
                  {copy.register.provider}
                </span>
              </button>
            </div>
            
            {/* Real-time Feature Hint Bubble Display */}
            <div className="mt-4 bg-slate-50 border border-slate-200/50 p-3.5 rounded-xl text-xs text-slate-500 font-medium leading-relaxed flex items-start gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-base text-[#2F4DA0] mt-0.5">info</span>
              <span>
                {role === 'customer' 
                  ? 'Access certified local professionals with instant coordinates and safe secure escrow milestones.' 
                  : copy.register.providerHint}
              </span>
            </div>
          </div>

          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            
            {/* Input fields wrapped with clear inline icons */}
            <div className="relative">
              <label className={labelClass} htmlFor="full-name">{copy.common.fullName}</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 material-symbols-outlined text-lg">person</span>
                <input
                  className={inputClass}
                  id="full-name"
                  placeholder={copy.register.fullNamePlaceholder}
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="email">{copy.common.emailAddress}</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 material-symbols-outlined text-lg">mail</span>
                  <input
                    className={inputClass}
                    id="email"
                    placeholder={copy.register.emailPlaceholder}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">{copy.common.phoneNumber}</label>
                <div className="flex relative items-center">
                  <span className="absolute left-4 text-xs font-bold text-slate-400 whitespace-nowrap select-none">+94</span>
                  <input
                    className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-[12px] text-sm text-[#111827] placeholder:text-slate-400 outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/10 transition-all"
                    id="phone"
                    placeholder={copy.register.phonePlaceholder}
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="password">{copy.common.password}</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 material-symbols-outlined text-lg">lock</span>
                  <input
                    className={`${inputClass} pr-11 ${passwordMismatch ? 'border-red-400 focus:border-red-400 focus:ring-red-500/10' : ''}`}
                    id="password"
                    placeholder={copy.register.passwordPlaceholder}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="confirm-password">{copy.common.confirmPassword}</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 material-symbols-outlined text-lg">lock_check</span>
                  <input
                    className={`${inputClass} pr-11 ${passwordMismatch ? 'border-red-400 focus:border-red-400 focus:ring-red-500/10' : ''}`}
                    id="confirm-password"
                    placeholder={copy.register.confirmPasswordPlaceholder}
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                  >
                    <span className="material-symbols-outlined text-lg">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="address">{copy.common.address}</label>
              <div className="relative flex items-start">
                <span className="absolute left-4 top-3.5 text-slate-400 material-symbols-outlined text-lg">pin_drop</span>
                <textarea
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-[12px] text-sm text-[#111827] placeholder:text-slate-400 outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/10 transition-all resize-none font-medium leading-relaxed"
                  id="address"
                  placeholder={role === 'provider' ? copy.register.providerAddressPlaceholder : copy.register.customerAddressPlaceholder}
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            {role === 'provider' && (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-slate-100" />
                  <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">{copy.register.providerDetails}</span>
                  <div className="flex-1 border-t border-slate-100" />
                </div>

                <div>
                  <label className={labelClass} htmlFor="service-category">{copy.register.serviceCategory}</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 material-symbols-outlined text-lg">construction</span>
                    <select
                      className="w-full h-12 pl-11 pr-10 bg-white border border-slate-200 rounded-[12px] text-sm text-[#111827] outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/10 transition-all appearance-none font-medium cursor-pointer"
                      id="service-category"
                      value={serviceCategory}
                      onChange={(e) => setServiceCategory(e.target.value)}
                    >
                      <option value="" disabled>{copy.register.serviceCategoryPlaceholder}</option>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <span className="absolute right-3.5 pointer-events-none text-slate-400 flex items-center">
                      <span className="material-symbols-outlined text-lg">expand_more</span>
                    </span>
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="service-area">{copy.register.serviceArea}</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 material-symbols-outlined text-lg">map</span>
                    <input
                      className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-[12px] text-sm text-[#111827] placeholder:text-slate-400 outline-none focus:border-[#2F4DA0] focus:ring-4 focus:ring-[#2F4DA0]/10 transition-all font-medium"
                      id="service-area"
                      placeholder={copy.register.serviceAreaPlaceholder}
                      type="text"
                      value={serviceArea}
                      onBlur={() => window.setTimeout(() => setShowLocationSuggestions(false), 150)}
                      onChange={(e) => {
                        setServiceArea(e.target.value);
                        setShowLocationSuggestions(true);
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                    />
                    {showLocationSuggestions && (locationSuggestions.length > 0 || locationLoading) ? (
                      <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 bg-white shadow-xl max-h-56 overflow-y-auto z-50">
                        {locationLoading && (
                          <div className="px-4 py-3 text-xs font-semibold text-slate-400 italic animate-pulse">{copy.register.searchingLocations}</div>
                        )}
                        {locationSuggestions.map((loc) => (
                          <button
                            key={`${loc.label}-${loc.coordinates.join(',')}`}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50/50 transition-colors border-b border-slate-100 last:border-0 flex flex-col cursor-pointer"
                            onMouseDown={() => applyProviderLocation(loc)}
                            type="button"
                          >
                            <span className="text-xs font-bold text-slate-800 truncate">{loc.label}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{copy.register.district}: {loc.district}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold text-[#2F4DA0] flex items-center gap-1 pl-1">
                    <span className="material-symbols-outlined text-sm">explore</span>
                    {copy.register.customersWillFindYouNear}{' '}
                    <span className="font-extrabold underline">{providerLocation?.district || DEFAULT_PROVIDER_LOCATION.district}</span>.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 mt-2">
              <input
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#2F4DA0] focus:ring-[#2F4DA0]/20 cursor-pointer"
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <div className="text-xs font-medium text-slate-500 leading-relaxed">
                <span>{role === 'provider' ? copy.register.providerTermsPrefix : copy.register.customerTermsPrefix} </span>
                <button className="text-[#2F4DA0] font-bold hover:underline cursor-pointer" type="button">
                  {role === 'provider' ? copy.common.serviceTerms : copy.common.termsOfService}
                </button>
                <span> {copy.register.and} </span>
                <button className="text-[#2F4DA0] font-bold hover:underline cursor-pointer" type="button">
                  {copy.common.privacyPolicy}
                </button>.
              </div>
            </div>

            <button
              className="w-full h-12 bg-[#2F4DA0] hover:bg-blue-800 text-white text-xs font-bold tracking-widest uppercase rounded-[12px] shadow-lg shadow-blue-900/10 active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 mt-2 cursor-pointer outline-none"
              type="submit"
              disabled={busy}
            >
              {busy ? copy.register.busy : role === 'provider' ? copy.register.submitProvider : copy.register.submit}
            </button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  {role === 'provider' ? copy.register.orContinue : copy.common.or}
                </span>
              </div>
            </div>

            <button
              className="w-full h-12 flex items-center justify-center gap-2.5 bg-white border border-slate-200 rounded-[12px] text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer outline-none"
              type="button"
              disabled={busy}
              onClick={onGoogleSignup}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {copy.register.google}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-5">
            <p className="text-sm font-medium text-slate-400">
              {copy.register.haveAccount}{' '}
              <Link className="font-bold text-[#2F4DA0] hover:underline" to="/login">{copy.register.login}</Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1.5 select-none">
          <span className="material-symbols-outlined text-base">security</span>
          {copy.common.secureFooter}
        </p>
      </footer>
    </section>
  );
}