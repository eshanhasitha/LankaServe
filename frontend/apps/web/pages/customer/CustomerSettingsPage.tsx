import { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '../../components/Avatar.tsx';
import Skeleton from '../../components/Skeleton.tsx';
import { useAuth } from '../../lib/auth-context.tsx';
import { apiRequest } from '../../lib/api.ts';
import { uploadProfileImage } from '../../lib/profile-image-client.ts';
import { changeCurrentUserPassword, getCurrentFirebaseAuthProvider } from '../../lib/firebase-client.ts';
import { DEFAULT_SRI_LANKA_LOCATION, searchSriLankaLocations } from '../../lib/location.ts';
import { notifyError } from '../../lib/toast.ts';

const tabs = [
  { key: 'profile', label: 'Profile', icon: 'person' },
  { key: 'security', label: 'Security', icon: 'shield' },
];

const notificationRows = [
  { key: 'jobUpdates', title: 'Job Updates', description: 'Receive notifications about status changes of your jobs.' },
  { key: 'newMessages', title: 'New Messages', description: 'Get notified when a provider or customer sends you a message.' },
  { key: 'paymentAlerts', title: 'Payment Alerts', description: 'Important notifications regarding invoices and bank payouts.' },
];

export default function CustomerSettingsPage() {
  const { user, accessToken, updateCurrentUser } = useAuth();
  const [resolvedAuthProvider, setResolvedAuthProvider] = useState(user?.authProvider || null);
  const requiresCurrentPassword = resolvedAuthProvider !== 'google';
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef('');
  const [activeTab, setActiveTab] = useState('profile');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([DEFAULT_SRI_LANKA_LOCATION]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    language: user?.language || 'en',
    profileImage: user?.profileImage || '',
    bio: user?.bio || '',
    district: user?.district || DEFAULT_SRI_LANKA_LOCATION.district,
    city: user?.city || DEFAULT_SRI_LANKA_LOCATION.city,
    location: user?.location || { type: 'Point', coordinates: DEFAULT_SRI_LANKA_LOCATION.coordinates },
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const passwordStrength = useMemo(() => getPasswordStrength(passwordForm.newPassword), [passwordForm.newPassword]);
  const [toggles, setToggles] = useState({
    jobUpdates: true,
    newMessages: true,
    paymentAlerts: false,
    profileAvailableNow: true,
  });

  useEffect(() => {
    setResolvedAuthProvider(user?.authProvider || null);
  }, [user?.authProvider]);

  useEffect(() => {
    if (activeTab !== 'security') return;
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage('');
  }, [activeTab, requiresCurrentPassword]);

  useEffect(() => {
    let active = true;
    async function resolveProvider() {
      try {
        const provider = await getCurrentFirebaseAuthProvider();
        if (active && provider) {
          setResolvedAuthProvider(provider);
        }
      } catch {
        // ignore and fall back to backend session data
      }
    }
    resolveProvider();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!accessToken) return;
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest('/users/me', { headers });
        if (!mounted) return;
        const me = response?.data || {};
        updateCurrentUser(me);
        const savedCoordinates =
          Array.isArray(me?.location?.coordinates) && me.location.coordinates.length === 2
            ? me.location.coordinates
            : DEFAULT_SRI_LANKA_LOCATION.coordinates;
        setForm((prev) => ({
          ...prev,
          fullName: me?.name || prev.fullName,
          email: me?.email || prev.email,
          language: me?.language || prev.language,
          profileImage: me?.profileImage || prev.profileImage,
          bio: me?.bio || prev.bio,
          district: me?.district || prev.district,
          city: me?.city || prev.city,
          location: { type: 'Point', coordinates: savedCoordinates },
        }));
        setLocationQuery(
          [me?.city || '', me?.district || '']
            .filter(Boolean)
            .join(', ') || DEFAULT_SRI_LANKA_LOCATION.label
        );
      } catch {
        // keep defaults
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (locationQuery) return;
    setLocationQuery([form.city, form.district].filter(Boolean).join(', '));
  }, [form.city, form.district, locationQuery]);

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
  }, []);

  useEffect(() => {
    if (!photoError) return;
    notifyError(photoError);
  }, [photoError]);

  useEffect(() => {
    if (!photoUploading) return undefined;
    const timer = window.setTimeout(() => {
      setPhotoUploading(false);
      setPhotoError((current) => current || 'Profile photo upload is taking too long. Please try again.');
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [photoUploading]);

  useEffect(() => {
    let active = true;
    const query = locationQuery.trim();

    const timer = window.setTimeout(async () => {
      try {
        setLocationLoading(true);
        const results = await searchSriLankaLocations(query);
        if (!active) return;
        setLocationSuggestions(results);
      } finally {
        if (active) setLocationLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [locationQuery]);

  function onField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyLocation(location) {
    setForm((prev) => ({
      ...prev,
      district: location.district,
      city: location.city,
      location: { type: 'Point', coordinates: location.coordinates },
    }));
    setLocationQuery(location.label);
    setShowLocationSuggestions(false);
  }

  function onToggle(key) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onSelectPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPhotoError('');
      setPhotoUploading(true);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const nextPreview = URL.createObjectURL(file);
      previewUrlRef.current = nextPreview;
      setPhotoPreview(nextPreview);
      const profileImage = await uploadProfileImage(file, accessToken);
      setForm((prev) => ({ ...prev, profileImage }));
      if (accessToken) {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest('/users/me', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ profileImage }),
        });
        updateCurrentUser(response?.data || { profileImage });
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = '';
      }
      setPhotoPreview('');
    } catch (error) {
      setPhotoError(error.message || 'Profile photo upload failed');
    } finally {
      setPhotoUploading(false);
      event.target.value = '';
    }
  }

  function removePhoto() {
    setPhotoError('');
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPhotoPreview('');
    onField('profileImage', '');
  }

  async function updatePasswordSettings() {
    if (passwordSaving) return;
    setPasswordMessage('');

    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;
    const confirmPassword = passwordForm.confirmPassword;

    if (requiresCurrentPassword && !currentPassword) {
      setPasswordMessage('Current password is required.');
      return;
    }
    if (!newPassword) {
      setPasswordMessage('New password is required.');
      return;
    }
    if (passwordStrength.score < 2) {
      setPasswordMessage('Password is too weak. Use 8+ characters with uppercase, lowercase, number, and symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New password and confirm password do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changeCurrentUserPassword({
        currentPassword,
        newPassword,
        requiresCurrentPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Password updated successfully.');
    } catch (error) {
      const message = error?.message || 'Failed to update password.';
      setPasswordMessage(message);
      notifyError(message);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function saveProfile() {
    if (!accessToken) return;
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await apiRequest('/users/me', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: form.fullName,
          language: form.language,
          profileImage: form.profileImage,
          bio: form.bio,
          district: form.district,
          city: form.city,
          location: form.location,
        }),
      });
      updateCurrentUser(response?.data || {
        name: form.fullName,
        language: form.language,
        profileImage: form.profileImage,
        bio: form.bio,
        district: form.district,
        city: form.city,
        location: form.location,
      });
    } catch (error) {
      setPhotoError(error.message || 'Profile changes could not be saved');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account preferences and security settings.</p>
      </header>

      <div className="flex gap-8 items-start">
        <aside className="w-66 shrink-0">
          <nav className="flex flex-col space-y-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  activeTab === tab.key
                    ? 'font-semibold text-[#2F4DA0] bg-[#EEF2FF] border-r-[3px] border-[#2F4DA0]'
                    : 'font-medium text-slate-600 hover:bg-white'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && loading ? (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 space-y-2">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-80" />
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-5">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-36 rounded-xl" />
                      <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                    <Skeleton className="h-4 w-80" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                  <Skeleton className="h-11 w-28 rounded-2xl" />
                  <Skeleton className="h-11 w-36 rounded-2xl" />
                </div>
              </div>
            </section>
          ) : null}
          {activeTab === 'profile' && !loading ? (
            <>
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <header className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold">Profile Information</h2>
                  <p className="text-sm text-slate-500">Complete your profile to increase trust among customers.</p>
                </header>

                <div className="p-6">
                  <div className="flex items-center gap-5 mb-8">
                    <Avatar src={photoPreview || form.profileImage} name={form.fullName} className="w-24 h-24 rounded-full border border-slate-200" />
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={onSelectPhoto} />
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-5 py-2 rounded-xl bg-[#2F4DA0] text-white text-sm font-bold hover:opacity-90 transition-all">{photoUploading ? 'Uploading...' : 'Upload New Photo'}</button>
                        <button type="button" onClick={removePhoto} className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">Remove</button>
                      </div>
                      <p className="text-sm text-slate-500 mt-2">Recommended: Square JPG or PNG, minimum 400x400 pixels.</p>
                    </div>
                  </div>

                  <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Full Name">
                        <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" value={form.fullName} onChange={(event) => onField('fullName', event.target.value)} />
                      </Field>
                      <Field label="Email Address">
                        <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" value={form.email} disabled />
                      </Field>
                    </div>

                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
                      <Field label="Language">
                        <select className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" value={form.language} onChange={(event) => onField('language', event.target.value)}>
                          <option value="en">English</option>
                          <option value="si">Sinhala</option>
                          <option value="ta">Tamil</option>
                        </select>
                      </Field>
                      <Field label="District">
                        <input className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-500" value={form.district} readOnly />
                      </Field>
                      <Field label="City">
                        <input className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-500" value={form.city} readOnly />
                      </Field>
                    </div>

                    <Field label="Search Location">
                      <div className="relative">
                        <input
                          className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]"
                          placeholder="Type your city or district in Sri Lanka"
                          value={locationQuery}
                          onBlur={() => window.setTimeout(() => setShowLocationSuggestions(false), 120)}
                          onChange={(event) => {
                            setLocationQuery(event.target.value);
                            setShowLocationSuggestions(true);
                          }}
                          onFocus={() => setShowLocationSuggestions(true)}
                        />
                        {showLocationSuggestions && (locationSuggestions.length || locationLoading) ? (
                          <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                            {locationLoading ? (
                              <div className="px-4 py-3 text-sm text-slate-500">Searching Sri Lanka locations...</div>
                            ) : null}
                            {locationSuggestions.map((location) => (
                              <button
                                key={`${location.label}-${location.coordinates.join(',')}`}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                onMouseDown={() => applyLocation(location)}
                                type="button"
                              >
                                <p className="text-sm font-semibold text-slate-900">{location.city}</p>
                                <p className="text-xs text-slate-400">{location.district}</p>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </Field>

                    <Field label="Bio / About Me">
                      <textarea className="w-full rounded-xl border-slate-200 text-sm resize-none focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" rows={4} placeholder="Tell us about your preferences..." value={form.bio} onChange={(event) => onField('bio', event.target.value)} />
                    </Field>

                    <div className="pt-5 border-t border-slate-100 flex justify-end gap-3">
                      <button type="button" className="px-9 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">Cancel</button>
                      <button type="submit" className="px-10 py-2.5 rounded-2xl bg-[#2F4DA0] text-white text-sm font-bold shadow-lg shadow-blue-400/20 hover:opacity-90 transition-all disabled:opacity-60" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                  </form>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-bold mb-5">Services & Availability</h2>
                <PreferenceRow id="profileAvailableNow" title="Available Now" description="Let providers know you are available to receive services right now." enabled={toggles.profileAvailableNow} onChange={() => onToggle('profileAvailableNow')} />
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-bold mb-5">Notification Preferences</h2>
                <div className="space-y-5">
                  {notificationRows.map((row) => (
                    <PreferenceRow key={row.key} id={row.key} title={row.title} description={row.description} enabled={toggles[row.key]} onChange={() => onToggle(row.key)} />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <header className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {requiresCurrentPassword
                    ? 'Update your password to keep your account secure.'
                    : 'Create a password for email sign-in on this account.'}
                </p>
              </header>
              <form className="p-6 max-w-[760px] space-y-5" autoComplete="off" onSubmit={(event) => { event.preventDefault(); updatePasswordSettings(); }}>
                {requiresCurrentPassword ? (
                  <PasswordField
                    id="current-password"
                    label="Current Password"
                    value={passwordForm.currentPassword}
                    onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
                    autoComplete="new-password"
                  />
                ) : null}
                <div className="space-y-2">
                  <PasswordField
                    id="new-password"
                    label="New Password"
                    value={passwordForm.newPassword}
                    onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                    autoComplete="new-password"
                  />
                  <div className="pt-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${passwordStrength.textClass}`}>{passwordStrength.label}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${passwordStrength.barClass}`} style={{ width: `${passwordStrength.percent}%` }} />
                    </div>
                  </div>
                </div>
                <PasswordField
                  id="confirm-password"
                  label="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
                  autoComplete="new-password"
                />
                {passwordMessage ? (
                  <p className={`text-sm ${passwordMessage.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {passwordMessage}
                  </p>
                ) : null}
                <div className="pt-4">
                  <button type="submit" className="px-7 py-2.5 rounded-2xl bg-[#2F4DA0] text-white text-sm font-bold shadow-lg shadow-blue-400/25 hover:opacity-90 transition-all disabled:opacity-60" disabled={passwordSaving}>
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function getPasswordStrength(password = '') {
  const value = String(password || '');
  if (!value) {
    return { score: 0, label: 'Weak', percent: 0, barClass: 'bg-slate-300', textClass: 'text-slate-400' };
  }
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 2) return { score, label: 'Weak', percent: 35, barClass: 'bg-red-400', textClass: 'text-red-500' };
  if (score <= 4) return { score, label: 'Medium', percent: 70, barClass: 'bg-amber-500', textClass: 'text-amber-600' };
  return { score, label: 'Strong', percent: 100, barClass: 'bg-emerald-500', textClass: 'text-emerald-600' };
}

function PasswordField({ id, label, value, onChange, autoComplete = 'off' }) {
  const [showPassword, setShowPassword] = useState(false);
  const [canType, setCanType] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={`${id}-field`}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setCanType(true)}
          readOnly={!canType}
          autoComplete={autoComplete}
          data-lpignore="true"
          className="password-no-native w-full h-12 rounded-xl border-slate-200 text-sm pr-11 focus:border-[#2F4DA0] focus:ring-[#2F4DA0]"
        />
        <button type="button" className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600" aria-label="Show password" onClick={() => setShowPassword((prev) => !prev)}>
          <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
    </div>
  );
}

function PreferenceRow({ id, title, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer" htmlFor={id}>
        <input id={id} type="checkbox" className="sr-only peer" checked={enabled} onChange={onChange} />
        <span className="w-11 h-6 bg-slate-200 rounded-full transition-colors peer-checked:bg-[#2F4DA0]" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white border border-slate-300 transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

