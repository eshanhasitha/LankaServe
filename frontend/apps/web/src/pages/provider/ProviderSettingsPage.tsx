import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth-context.tsx';
import { apiRequest } from '../../lib/api.ts';
import { uploadImageFile, uploadProfileImage } from '../../lib/profile-image-client.ts';
import { changeCurrentUserPassword, getCurrentFirebaseAuthProvider } from '../../lib/firebase-client.ts';
import Avatar from '../../components/Avatar.tsx';
import Skeleton from '../../components/Skeleton.tsx';
import { DEFAULT_SRI_LANKA_LOCATION, searchSriLankaLocations } from '../../lib/location.ts';
import { notifyError } from '../../lib/toast.ts';

const tabs = [
  { key: 'profile', label: 'Profile', icon: 'person' },
  { key: 'security', label: 'Security', icon: 'shield' },
  { key: 'services', label: 'Services & Availability', icon: 'calendar_today' },
  { key: 'verification', label: 'Verification', icon: 'verified_user' },
];

export default function ProviderSettingsPage() {
  const { user, accessToken, updateCurrentUser } = useAuth();
  const [resolvedAuthProvider, setResolvedAuthProvider] = useState(user?.authProvider || null);
  const requiresCurrentPassword = resolvedAuthProvider !== 'google';
  const fileInputRef = useRef(null);
  const verificationFileInputRef = useRef(null);
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
    profileImage: user?.profileImage || '',
    bio: '',
    district: DEFAULT_SRI_LANKA_LOCATION.district,
    city: DEFAULT_SRI_LANKA_LOCATION.city,
    location: { type: 'Point', coordinates: DEFAULT_SRI_LANKA_LOCATION.coordinates },
    categories: '',
    yearsExperience: 0,
    availability: 'offline',
  });
  const [verificationForm, setVerificationForm] = useState({
    legalName: user?.name || '',
    nicNumber: '',
    phone: '',
    address: '',
    serviceArea: '',
    businessRegistrationNumber: '',
    notes: '',
    verificationDocs: [],
  });
  const [verificationState, setVerificationState] = useState({
    verified: false,
    status: 'not_submitted',
    submittedAt: null,
    reviewedAt: null,
    rejectionReason: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [verificationUploading, setVerificationUploading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const passwordStrength = useMemo(() => getPasswordStrength(passwordForm.newPassword), [passwordForm.newPassword]);

  useEffect(() => {
    if (activeTab !== 'security') return;
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordMessage('');
  }, [activeTab, requiresCurrentPassword]);

  useEffect(() => {
    setResolvedAuthProvider(user?.authProvider || null);
  }, [user?.authProvider]);

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
        const [providerRes, userRes] = await Promise.all([
          apiRequest('/providers/me', { headers }).catch(() => ({ data: null })),
          apiRequest('/users/me', { headers }).catch(() => ({ data: null })),
        ]);
        if (!mounted) return;
        const provider = providerRes?.data || {};
        const me = userRes?.data || {};
        updateCurrentUser(me);
        const savedCoordinates =
          Array.isArray(provider?.location?.coordinates) && provider.location.coordinates.length === 2
            ? provider.location.coordinates
            : DEFAULT_SRI_LANKA_LOCATION.coordinates;
        setForm((prev) => ({
          ...prev,
          fullName: me?.name || prev.fullName,
          email: me?.email || prev.email,
          profileImage: me?.profileImage || prev.profileImage,
          bio: provider?.bio || '',
          district: provider?.district || prev.district,
          city: provider?.city || prev.city,
          location: { type: 'Point', coordinates: savedCoordinates },
          categories: Array.isArray(provider?.categories) ? provider.categories.join(', ') : '',
          yearsExperience: provider?.yearsExperience || 0,
          availability: provider?.availability || 'offline',
        }));
        const verification = provider?.verification || {};
        setVerificationForm({
          legalName: verification?.legalName || me?.name || '',
          nicNumber: verification?.nicNumber || '',
          phone: verification?.phone || '',
          address: verification?.address || '',
          serviceArea: verification?.serviceArea || [provider?.city, provider?.district].filter(Boolean).join(', '),
          businessRegistrationNumber: verification?.businessRegistrationNumber || '',
          notes: verification?.notes || '',
          verificationDocs: Array.isArray(provider?.verificationDocs) ? provider.verificationDocs : [],
        });
        setVerificationState({
          verified: Boolean(provider?.verified),
          status: provider?.verified ? 'verified' : (verification?.status || 'not_submitted'),
          submittedAt: verification?.submittedAt || null,
          reviewedAt: verification?.reviewedAt || null,
          rejectionReason: verification?.rejectionReason || '',
        });
        setLocationQuery(
          [provider?.city || '', provider?.district || '']
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
  }, [accessToken, user?.email, user?.name]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        setLocationLoading(true);
        const results = await searchSriLankaLocations(locationQuery);
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

  function onField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onVerificationField(key, value) {
    setVerificationForm((prev) => ({ ...prev, [key]: value }));
    setVerificationMessage('');
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

  async function onSelectVerificationDocs(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !accessToken) return;

    const remainingSlots = Math.max(0, 5 - verificationForm.verificationDocs.length);
    const selectedFiles = files.slice(0, remainingSlots);
    if (!selectedFiles.length) {
      setVerificationMessage('You can upload up to 5 verification documents.');
      event.target.value = '';
      return;
    }

    setVerificationUploading(true);
    setVerificationMessage('');
    try {
      const uploadedUrls = [];
      for (const file of selectedFiles) {
        const url = await uploadImageFile(file, accessToken, {
          label: 'Verification document',
          path: '/uploads/provider-verification',
        });
        uploadedUrls.push(url);
      }
      setVerificationForm((prev) => ({
        ...prev,
        verificationDocs: [...prev.verificationDocs, ...uploadedUrls].slice(0, 5),
      }));
    } catch (error) {
      const message = error?.message || 'Verification document upload failed.';
      setVerificationMessage(message);
      notifyError(message);
    } finally {
      setVerificationUploading(false);
      event.target.value = '';
    }
  }

  function removeVerificationDoc(index) {
    setVerificationForm((prev) => ({
      ...prev,
      verificationDocs: prev.verificationDocs.filter((_, itemIndex) => itemIndex !== index),
    }));
    setVerificationMessage('');
  }

  async function submitVerification() {
    if (!accessToken || verificationSaving) return;

    const payload = {
      ...verificationForm,
      legalName: verificationForm.legalName.trim(),
      nicNumber: verificationForm.nicNumber.trim(),
      phone: verificationForm.phone.trim(),
      address: verificationForm.address.trim(),
      serviceArea: verificationForm.serviceArea.trim(),
      businessRegistrationNumber: verificationForm.businessRegistrationNumber.trim(),
      notes: verificationForm.notes.trim(),
    };

    if (!payload.legalName || !payload.nicNumber || !payload.phone || !payload.address || !payload.serviceArea) {
      setVerificationMessage('Fill legal name, NIC/passport, phone, address, and service area.');
      return;
    }

    if (!payload.verificationDocs.length) {
      setVerificationMessage('Upload at least one verification document image.');
      return;
    }

    setVerificationSaving(true);
    setVerificationMessage('');
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const response = await apiRequest('/providers/verification', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const provider = response?.data || {};
      const verification = provider?.verification || {};
      setVerificationForm((prev) => ({
        ...prev,
        ...payload,
        verificationDocs: Array.isArray(provider?.verificationDocs) ? provider.verificationDocs : payload.verificationDocs,
      }));
      setVerificationState({
        verified: Boolean(provider?.verified),
        status: provider?.verified ? 'verified' : (verification?.status || 'pending'),
        submittedAt: verification?.submittedAt || null,
        reviewedAt: verification?.reviewedAt || null,
        rejectionReason: verification?.rejectionReason || '',
      });
      setVerificationMessage('Verification submitted for admin review.');
    } catch (error) {
      const message = error?.message || 'Verification could not be submitted.';
      setVerificationMessage(message);
      notifyError(message);
    } finally {
      setVerificationSaving(false);
    }
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
      const [userResponse] = await Promise.all([
        apiRequest('/users/me', { method: 'PUT', headers, body: JSON.stringify({ name: form.fullName, profileImage: form.profileImage }) }),
        apiRequest('/providers/me', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            bio: form.bio,
            district: form.district,
            city: form.city,
            location: form.location,
            yearsExperience: Number(form.yearsExperience || 0),
            categories: form.categories.split(',').map((item) => item.trim()).filter(Boolean),
          }),
        }),
      ]);
      updateCurrentUser(userResponse?.data || { name: form.fullName, profileImage: form.profileImage });
    } catch (error) {
      setPhotoError(error.message || 'Profile changes could not be saved');
    } finally {
      setSaving(false);
    }
  }

  async function saveAvailability(nextAvailability) {
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    setForm((prev) => ({ ...prev, availability: nextAvailability }));
    try {
      await apiRequest('/providers/availability', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ availability: nextAvailability }),
      });
    } catch {
      // optimistic UI
    }
  }

  const verificationBadge = getVerificationBadge(verificationState);

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account preferences and security settings.</p>
      </header>

      <div className="grid grid-cols-12 gap-8 items-start">
        <aside className="col-span-4 2xl:col-span-3">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all ${
                  activeTab === tab.key
                    ? 'font-semibold text-[#2F4DA0] bg-[#EEF2FF] border-r-[3px] border-[#2F4DA0]'
                    : 'font-medium text-slate-600 hover:bg-white'
                }`}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <section className="mt-8 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Trust Level</p>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Verification Status</h3>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-lg font-bold ${verificationBadge.className}`}>
              <span className="material-symbols-outlined text-lg">{verificationBadge.icon}</span>
              {verificationBadge.label}
            </div>
            <p className="text-sm text-slate-500 mt-4">{verificationBadge.help}</p>
          </section>
        </aside>

        <div className="col-span-8 2xl:col-span-9 space-y-6">
          {activeTab === 'profile' && loading ? (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 space-y-2">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-80" />
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-6">
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
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
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
                  <h2 className="text-lg font-bold text-slate-900">Profile Information</h2>
                  <p className="text-sm text-slate-500">Complete your profile to increase trust among customers.</p>
                </header>

                <form className="p-6 space-y-6" onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
                  <div className="flex items-center gap-6">
                    <Avatar src={photoPreview || form.profileImage} name={form.fullName} className="w-24 h-24 rounded-full border border-slate-200" />
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={onSelectPhoto} />
                      <div className="flex items-center gap-3">
                        <button className="px-5 py-2 rounded-xl bg-[#2F4DA0] text-white text-sm font-bold hover:opacity-90" type="button" onClick={() => fileInputRef.current?.click()}>{photoUploading ? 'Uploading...' : 'Upload New Photo'}</button>
                        <button className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50" type="button" onClick={removePhoto}>Remove</button>
                      </div>
                      <p className="text-sm text-slate-500 mt-2">Recommended: Square JPG or PNG, minimum 400x400 pixels.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name">
                      <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" type="text" value={form.fullName} onChange={(event) => onField('fullName', event.target.value)} />
                    </Field>
                    <Field label="Email Address">
                      <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" type="email" value={form.email} disabled />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Categories (comma separated)">
                      <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" type="text" value={form.categories} onChange={(event) => onField('categories', event.target.value)} />
                    </Field>
                    <Field label="Years of Experience">
                      <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" type="number" min="0" value={form.yearsExperience} onChange={(event) => onField('yearsExperience', event.target.value)} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="District">
                      <input className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-500" type="text" value={form.district} readOnly />
                    </Field>
                    <Field label="City">
                      <input className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-500" type="text" value={form.city} readOnly />
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
                        type="text"
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
                    <textarea className="w-full rounded-xl border-slate-200 text-sm resize-none focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" rows={4} placeholder="Tell us about your expertise and services..." value={form.bio} onChange={(event) => onField('bio', event.target.value)} />
                  </Field>

                  <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button className="px-9 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50" type="button">Cancel</button>
                    <button className="px-10 py-2.5 rounded-2xl bg-[#2F4DA0] text-white text-sm font-bold shadow-lg shadow-blue-400/20 hover:opacity-90 disabled:opacity-60" type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </section>
            </>
          ) : null}

          {activeTab === 'security' ? (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <header className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {requiresCurrentPassword
                    ? 'Update your password to keep your account secure.'
                    : 'Create a password for email sign-in on this account.'}
                </p>
              </header>
              <form className="p-6 max-w-[720px] space-y-5" autoComplete="off" onSubmit={(event) => { event.preventDefault(); updatePasswordSettings(); }}>
                {requiresCurrentPassword ? (
                  <PasswordField
                    id="provider-current-password"
                    label="Current Password"
                    value={passwordForm.currentPassword}
                    onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
                    autoComplete="new-password"
                  />
                ) : null}
                <div className="space-y-2">
                  <PasswordField
                    id="provider-new-password"
                    label="New Password"
                    value={passwordForm.newPassword}
                    onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                    autoComplete="new-password"
                  />
                  <div className="pt-1.5">
                    <span className={`text-sm font-bold ${passwordStrength.textClass}`}>
                      {passwordStrength.label}
                    </span>
                    <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${passwordStrength.barClass}`}
                        style={{ width: `${passwordStrength.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <PasswordField
                  id="provider-confirm-password"
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
                  <button className="px-8 py-3 rounded-2xl bg-[#2F4DA0] text-white text-sm font-bold shadow-lg shadow-blue-400/25 hover:opacity-90 transition-all disabled:opacity-60" type="submit" disabled={passwordSaving}>
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {activeTab === 'services' ? (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold mb-5">Services & Availability</h2>
              <div className="flex items-center justify-between py-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Available Now</h3>
                  <p className="text-sm text-slate-500">Allow customers to send requests instantly when you are online.</p>
                </div>
                <Toggle checked={form.availability === 'online'} onChange={() => saveAvailability(form.availability === 'online' ? 'offline' : 'online')} />
              </div>
            </section>
          ) : null}

          {activeTab === 'verification' ? (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <header className="p-6 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Provider Verification</h2>
                  <p className="text-sm text-slate-500 mt-1">Submit identity and service proof for admin review.</p>
                </div>
                <div className={`inline-flex w-fit items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold ${verificationBadge.className}`}>
                  <span className="material-symbols-outlined text-lg">{verificationBadge.icon}</span>
                  {verificationBadge.label}
                </div>
              </header>

              <form className="p-6 space-y-6" onSubmit={(event) => { event.preventDefault(); submitVerification(); }}>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-600">
                  <span className="font-semibold text-[#2F4DA0]">Required:</span> upload a clear NIC/passport image and any trade certificate, business registration, or work proof you have.
                  {verificationState.submittedAt ? (
                    <span className="block mt-1 text-xs text-slate-500">Last submitted {formatVerificationDate(verificationState.submittedAt)}.</span>
                  ) : null}
                  {verificationState.rejectionReason ? (
                    <span className="block mt-1 text-xs font-semibold text-red-600">Rejected reason: {verificationState.rejectionReason}</span>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Legal Full Name">
                    <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" type="text" value={verificationForm.legalName} onChange={(event) => onVerificationField('legalName', event.target.value)} />
                  </Field>
                  <Field label="NIC / Passport Number">
                    <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" type="text" value={verificationForm.nicNumber} onChange={(event) => onVerificationField('nicNumber', event.target.value)} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone Number">
                    <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" placeholder="+94 77 123 4567" type="tel" value={verificationForm.phone} onChange={(event) => onVerificationField('phone', event.target.value)} />
                  </Field>
                  <Field label="Primary Service Area">
                    <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" placeholder="Colombo, Dehiwala, Kandy..." type="text" value={verificationForm.serviceArea} onChange={(event) => onVerificationField('serviceArea', event.target.value)} />
                  </Field>
                </div>

                <Field label="Residential / Business Address">
                  <textarea className="w-full rounded-xl border-slate-200 text-sm resize-none focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" rows={3} value={verificationForm.address} onChange={(event) => onVerificationField('address', event.target.value)} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Business Registration Number (Optional)">
                    <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" type="text" value={verificationForm.businessRegistrationNumber} onChange={(event) => onVerificationField('businessRegistrationNumber', event.target.value)} />
                  </Field>
                  <Field label="Reviewer Notes (Optional)">
                    <input className="w-full h-12 rounded-xl border-slate-200 text-sm focus:border-[#2F4DA0] focus:ring-[#2F4DA0]" placeholder="Certificate type, years active, etc." type="text" value={verificationForm.notes} onChange={(event) => onVerificationField('notes', event.target.value)} />
                  </Field>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700">Verification Documents</h3>
                      <p className="text-xs text-slate-400">Upload up to 5 JPG, PNG, or WEBP images. Max 5MB each.</p>
                    </div>
                    <input ref={verificationFileInputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" multiple onChange={onSelectVerificationDocs} />
                    <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#2F4DA0] hover:bg-blue-50 disabled:opacity-60" type="button" disabled={verificationUploading || verificationForm.verificationDocs.length >= 5} onClick={() => verificationFileInputRef.current?.click()}>
                      {verificationUploading ? 'Uploading...' : 'Upload Documents'}
                    </button>
                  </div>

                  {verificationForm.verificationDocs.length ? (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                      {verificationForm.verificationDocs.map((url, index) => (
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" key={`${url}-${index}`}>
                          <img className="h-36 w-full object-cover" src={url} alt={`Verification document ${index + 1}`} />
                          <div className="flex items-center justify-between px-3 py-2">
                            <a className="truncate text-xs font-semibold text-[#2F4DA0] hover:underline" href={url} target="_blank" rel="noreferrer">Document {index + 1}</a>
                            <button className="text-xs font-bold text-red-500" type="button" onClick={() => removeVerificationDoc(index)}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button className="flex min-h-[160px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center hover:border-[#2F4DA0] hover:bg-blue-50/40" type="button" onClick={() => verificationFileInputRef.current?.click()}>
                      <span className="material-symbols-outlined text-4xl text-slate-400">upload_file</span>
                      <span className="mt-2 text-sm font-semibold text-slate-600">Click to upload verification documents</span>
                      <span className="text-xs text-slate-400">NIC/passport, certificate, or business proof</span>
                    </button>
                  )}
                </div>

                {verificationMessage ? (
                  <p className={`text-sm ${verificationMessage.toLowerCase().includes('submitted') ? 'text-emerald-600' : 'text-red-600'}`}>{verificationMessage}</p>
                ) : null}

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button className="px-9 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50" type="button" onClick={() => setActiveTab('profile')}>Cancel</button>
                  <button className="px-10 py-2.5 rounded-2xl bg-[#2F4DA0] text-white text-sm font-bold shadow-lg shadow-blue-400/20 hover:opacity-90 disabled:opacity-60" type="submit" disabled={verificationSaving || verificationUploading}>
                    {verificationSaving ? 'Submitting...' : 'Submit Verification'}
                  </button>
                </div>
              </form>
            </section>
          ) : null}
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

function getVerificationBadge(state) {
  const status = state?.verified ? 'verified' : String(state?.status || 'not_submitted');
  if (status === 'verified') {
    return {
      label: 'Verified',
      icon: 'verified',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      help: 'Your verified provider badge is active.',
    };
  }
  if (status === 'pending') {
    return {
      label: 'Pending',
      icon: 'schedule',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      help: 'Your verification is waiting for admin review.',
    };
  }
  if (status === 'rejected') {
    return {
      label: 'Rejected',
      icon: 'error',
      className: 'bg-red-50 text-red-700 border-red-200',
      help: state?.rejectionReason || 'Update your details and submit again.',
    };
  }
  return {
    label: 'Not Submitted',
    icon: 'warning',
    className: 'bg-slate-50 text-slate-600 border-slate-200',
    help: 'Complete verification to get the "Verified Provider" badge.',
  };
}

function formatVerificationDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
          className="password-no-native w-full h-12 rounded-xl border-slate-200 text-sm pr-11 focus:border-[#2F4DA0] focus:ring-[#2F4DA0]"
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setCanType(true)}
          readOnly={!canType}
          autoComplete={autoComplete}
          data-lpignore="true"
        />
        <button className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600" type="button" onClick={() => setShowPassword((prev) => !prev)}>
          <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <span className="w-11 h-6 bg-slate-200 rounded-full transition-colors peer-checked:bg-[#2F4DA0]" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white border border-slate-300 transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

