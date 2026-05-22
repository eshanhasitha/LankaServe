import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth-context.tsx';
import Skeleton from '../../components/Skeleton.tsx';

const EMPTY_BADGES = {
  summary: {
    unlockedCount: 0,
    totalCount: 0,
    completionPercent: 0,
    currentLevel: 'Level 0',
    nextMilestone: 'N/A',
    rankLabel: 'New',
    rankPosition: 0,
    totalProviders: 0,
  },
  active: [],
  locked: [],
  benefits: [],
};

const accentClasses = {
  yellow: {
    wrap: 'bg-yellow-50 text-yellow-500 border-yellow-100',
    pill: 'bg-yellow-100 text-yellow-700',
    benefit: 'bg-yellow-50 border-yellow-100',
  },
  blue: {
    wrap: 'bg-blue-50 text-[#2F4DA0] border-blue-100',
    pill: 'bg-blue-100 text-[#2F4DA0]',
    benefit: 'bg-blue-50 border-blue-100',
  },
  orange: {
    wrap: 'bg-orange-50 text-orange-500 border-orange-100',
    pill: 'bg-orange-100 text-orange-700',
    benefit: 'bg-orange-50 border-orange-100',
  },
  emerald: {
    wrap: 'bg-emerald-50 text-emerald-500 border-emerald-100',
    pill: 'bg-emerald-100 text-emerald-700',
    benefit: 'bg-emerald-50 border-emerald-100',
  },
  purple: {
    wrap: 'bg-purple-50 text-purple-500 border-purple-100',
    pill: 'bg-purple-100 text-purple-700',
    benefit: 'bg-purple-50 border-purple-100',
  },
  slate: {
    wrap: 'bg-slate-50 text-slate-400 border-slate-100',
    pill: 'bg-slate-100 text-slate-500',
    benefit: 'bg-slate-50 border-slate-100',
  },
};

function getAccent(accent) {
  return accentClasses[accent] || accentClasses.slate;
}

export default function ProviderBadgesPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState(EMPTY_BADGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadBadges() {
      if (!accessToken) {
        if (mounted) {
          setData(EMPTY_BADGES);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');

      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const response = await apiRequest('/providers/badges', { headers });
        if (!mounted) return;
        setData(response?.data || EMPTY_BADGES);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError?.message || 'Failed to load badge data.');
        setData(EMPTY_BADGES);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBadges();
    return () => {
      mounted = false;
    };
  }, [accessToken]);

  const activeBadges = Array.isArray(data.active) ? data.active : [];
  const lockedBadges = Array.isArray(data.locked) ? data.locked : [];
  const benefits = Array.isArray(data.benefits) ? data.benefits : [];
  const rankLine = `${data.summary.currentLevel || 'Provider'}${data.summary.rankLabel ? ` \u00B7 ${data.summary.rankLabel}` : ''}`;
  const rankPositionLine = data.summary.totalProviders
    ? `#${data.summary.rankPosition}/${data.summary.totalProviders}`
    : '';

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Badges</h1>
          <p className="text-slate-500 text-sm">Track your performance, unlock badge milestones, and improve profile visibility.</p>
        </div>

        <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">military_tech</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Rank</p>
            <p className="text-sm font-bold text-slate-900 tracking-tight">{rankLine}</p>
            {rankPositionLine ? (
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{rankPositionLine}</p>
            ) : null}
          </div>
        </div>
      </div>

      <section className="bg-white p-8 rounded-[16px] shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Seller Milestone: {data.summary.currentLevel}</h2>
              <p className="text-slate-500 text-sm mt-1">
                {data.summary.unlockedCount} of {data.summary.totalCount} badges unlocked. Next target: {data.summary.nextMilestone}.
              </p>
            </div>
            <span className="bg-blue-100 text-[#2F4DA0] text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">Milestone Progress</span>
          </div>

          <div className="space-y-4">
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#2F4DA0] to-blue-500 h-full transition-all" style={{ width: `${data.summary.completionPercent}%` }} />
            </div>
            <div className="flex flex-col gap-2 text-sm font-semibold md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Current Level:</span>
                <span className="text-[#2F4DA0]">{data.summary.currentLevel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Next Milestone:</span>
                <span className="text-slate-900">{data.summary.nextMilestone}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Performance Badges</h3>
          <span className="text-xs text-slate-400 font-medium">Earn badges to boost your profile visibility</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-100">
                <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
                <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-3 w-1/2 mx-auto mb-4" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...activeBadges, ...lockedBadges].map((badge) => (
              <BadgeCard key={badge.code} badge={badge} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-6">Unlocked Benefits</h3>
        {benefits.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px]">
            {benefits.map((benefit) => (
              <BenefitCard key={benefit.code} benefit={benefit} />
            ))}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px]">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={`benefit-skeleton-${index}`} className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-100 flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-[16px] shadow-sm border border-slate-100 text-sm text-slate-500">
            Unlock your first badge to start receiving profile visibility benefits.
          </div>
        )}
      </section>

      {error ? (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function BadgeCard({ badge }) {
  const accent = getAccent(badge.accent);

  return (
    <article className={`bg-white p-6 rounded-[16px] shadow-sm border text-center ${badge.unlocked ? 'border-slate-100' : 'border-dashed border-slate-200 opacity-80'}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${accent.wrap}`}>
        <span className="material-symbols-outlined text-3xl">{badge.icon || 'military_tech'}</span>
      </div>
      <h4 className="font-bold text-slate-900 mb-1">{badge.name}</h4>
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${badge.unlocked ? 'bg-emerald-500' : 'bg-orange-400'}`} />
        <span className={`text-[10px] font-bold uppercase ${badge.unlocked ? 'text-emerald-600' : 'text-orange-500'}`}>
          {badge.unlocked ? 'Active' : 'In Progress'}
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">{badge.description}</p>
      <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="bg-[#2F4DA0] h-full transition-all" style={{ width: `${badge.progressPercent}%` }} />
      </div>
      <p className="text-[10px] text-slate-400 font-medium mt-2">{badge.progressDetail}</p>
      <span className={`inline-flex mt-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${accent.pill}`}>
        {badge.requirementText}
      </span>
    </article>
  );
}

function BenefitCard({ benefit }) {
  const accent = getAccent(benefit.accent);

  return (
    <article className={`p-6 rounded-[16px] border flex items-start gap-4 ${accent.benefit}`}>
      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
        <span className={`material-symbols-outlined ${accent.wrap.split(' ')[1]}`}>{benefit.icon || 'workspace_premium'}</span>
      </div>
      <div>
        <h4 className="font-bold text-slate-900">{benefit.title}</h4>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{benefit.description}</p>
      </div>
    </article>
  );
}

