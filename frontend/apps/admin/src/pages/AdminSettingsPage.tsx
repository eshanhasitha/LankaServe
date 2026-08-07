import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';
import ChangePasswordModal from '../components/ChangePasswordModal.tsx';

const STORAGE_KEY = 'admin_settings_v1';

const defaultSettings = {
  siteName: 'LankaServe',
  contactEmail: 'admin@lankaserve.com',
  language: 'EN',
  notifications: {
    newBookings: true,
    systemUpdates: true,
    securityAlerts: true,
  },
  theme: 'light',
  timezone: 'GMT+05:30',
};

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      notifications: {
        ...defaultSettings.notifications,
        ...(parsed?.notifications || {}),
      },
    };
  } catch {
    return null;
  }
}

function formatServerTime(date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', ' -');
}

export default function AdminSettingsPage() {
  const { admin } = useAdminAuth();

  const [savedSettings, setSavedSettings] = useState(defaultSettings);
  const [settings, setSettings] = useState(defaultSettings);
  const [serverTime, setServerTime] = useState(new Date());
  const [message, setMessage] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const stored = readStoredSettings();
    const merged = {
      ...defaultSettings,
      ...(stored || {}),
      contactEmail: stored?.contactEmail || admin?.email || defaultSettings.contactEmail,
      notifications: {
        ...defaultSettings.notifications,
        ...(stored?.notifications || {}),
      },
    };
    setSavedSettings(merged);
    setSettings(merged);
  }, [admin?.email]);

  useEffect(() => {
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

  function updateField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setMessage('');
  }

  function updateNotification(field, value) {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value,
      },
    }));
    setMessage('');
  }

  function discardChanges() {
    setSettings(savedSettings);
    setMessage('Changes discarded.');
  }

  function saveChanges() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSavedSettings(settings);
    setMessage('Settings saved successfully.');
  }

  return (
    <div className="pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage global system configurations and security preferences.</p>
      </div>

      {message ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p>
      ) : null}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="material-symbols-outlined text-slate-400">tune</span>
                General Settings
              </h2>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Site Name</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(event) => updateField('siteName', event.target.value)}
                    className="w-full rounded-lg border-slate-200 text-sm focus:border-(--primary) focus:ring-(--primary)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Contact Email</label>
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(event) => updateField('contactEmail', event.target.value)}
                    className="w-full rounded-lg border-slate-200 text-sm focus:border-(--primary) focus:ring-(--primary)"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="material-symbols-outlined text-slate-400">security</span>
                Security Settings
              </h2>
            </div>
            <div className="space-y-6 p-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">First Login Password Policy</h3>
                  <p className="text-xs text-slate-500">
                    Admins sign in with the password provided by the IT team on first login, then they must change it immediately.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="rounded-lg border-2 border-(--primary) px-4 py-2 text-sm font-bold text-(--primary) transition-colors hover:bg-blue-50"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                Change Admin Password
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="material-symbols-outlined text-slate-400">notifications_active</span>
                Notification Settings
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.newBookings}
                    onChange={(event) => updateNotification('newBookings', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-(--primary) focus:ring-(--primary)"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">New Bookings</span>
                </label>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.systemUpdates}
                    onChange={(event) => updateNotification('systemUpdates', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-(--primary) focus:ring-(--primary)"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">System Updates</span>
                </label>
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.securityAlerts}
                    onChange={(event) => updateNotification('securityAlerts', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-(--primary) focus:ring-(--primary)"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Security Alerts</span>
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="col-span-12 space-y-6 lg:col-span-4">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="material-symbols-outlined text-slate-400">palette</span>
                System Preferences
              </h2>
            </div>

            <div className="space-y-6 p-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Theme Selection</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('theme', 'light')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
                      settings.theme === 'light'
                        ? 'border-(--primary) bg-blue-50 text-(--primary)'
                        : 'border-slate-100 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">light_mode</span>
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('theme', 'dark')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
                      settings.theme === 'dark'
                        ? 'border-(--primary) bg-blue-50 text-(--primary)'
                        : 'border-slate-100 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">dark_mode</span>
                    Dark
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(event) => updateField('timezone', event.target.value)}
                  className="w-full rounded-lg border-slate-200 text-sm focus:border-(--primary) focus:ring-(--primary)"
                >
                  <option value="GMT+05:30">(GMT+05:30) Colombo</option>
                  <option value="GMT+00:00">(GMT+00:00) London</option>
                  <option value="GMT-05:00">(GMT-05:00) New York</option>
                </select>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <div className="space-y-4 p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">System Info</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Version</span>
                  <span className="text-xs font-bold text-slate-700">v2.4.12-pro</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Server Time</span>
                  <span className="text-xs font-bold text-slate-700">{formatServerTime(serverTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Uptime</span>
                  <span className="text-xs font-bold text-emerald-600">99.98%</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-(--sidebar-width) right-0 z-30 flex h-20 items-center justify-end gap-4 border-t border-slate-200 bg-white px-8 shadow-lg">
        <button type="button" onClick={discardChanges} className="px-6 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800">
          Discard
        </button>
        <button
          type="button"
          onClick={saveChanges}
          disabled={!isDirty}
          className="rounded-xl bg-(--primary) px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save Changes
        </button>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

