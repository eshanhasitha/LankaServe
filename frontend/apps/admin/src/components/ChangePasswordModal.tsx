import { useState } from 'react';
import { useAdminAuth } from '../lib/auth-context.tsx';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const { authorizedRequest, updateAdminUser } = useAdminAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authorizedRequest('/admin-auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response?.data) {
        updateAdminUser(response.data);
      }

      setSuccessMsg('Admin password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#3151B7]">lock_reset</span>
            <h2 className="text-lg font-bold text-slate-900">Change Admin Password</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}

          {successMsg ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-600">
              {successMsg}
            </p>
          ) : null}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-[#3151B7] focus:ring-2 focus:ring-[#3151B7]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-[#3151B7] focus:ring-2 focus:ring-[#3151B7]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-[#3151B7] focus:ring-2 focus:ring-[#3151B7]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#3151B7] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#253D80] disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
