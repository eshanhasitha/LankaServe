import ServiceProvider from '../models/ServiceProvider.model.js';
import Badge from '../models/Badge.model.js';

const BADGE_DEFINITIONS = [
    {
        code: 'TOP_RATED',
        name: 'Top Rated',
        weight: 15,
        icon: 'workspace_premium',
        accent: 'yellow',
        description: 'Maintain excellent customer reviews while finishing steady work.',
        requirementText: '4.5+ rating and 20 completed jobs',
        benefit: {
            title: 'Priority Listing',
            description: 'Your profile appears higher in customer search results.',
        },
        progress: ({ averageRating, completedJobs }) => ({
            current: Math.min(100, Math.round(Math.min((averageRating / 4.5) * 100, (completedJobs / 20) * 100))),
            detail: `${averageRating.toFixed(1)} rating · ${completedJobs}/20 jobs`,
        }),
        unlocked: ({ averageRating, completedJobs }) => averageRating >= 4.5 && completedJobs >= 20,
    },
    {
        code: 'RELIABLE',
        name: 'Reliable',
        weight: 10,
        icon: 'verified',
        accent: 'blue',
        description: 'Complete accepted work consistently and keep cancellations low.',
        requirementText: '95% completion rate',
        benefit: {
            title: 'Trust Boost',
            description: 'Customers see a stronger reliability signal on your profile.',
        },
        progress: ({ completionRate }) => ({
            current: Math.min(100, Math.round((completionRate / 95) * 100)),
            detail: `${completionRate.toFixed(1)}% completion rate`,
        }),
        unlocked: ({ completionRate }) => completionRate >= 95,
    },
    {
        code: 'FAST_RESPONDER',
        name: 'Fast Responder',
        weight: 8,
        icon: 'speed',
        accent: 'orange',
        description: 'Reply quickly when customers request work.',
        requirementText: 'Average response time under 5 minutes',
        benefit: {
            title: 'Response Highlight',
            description: 'Fast replies are highlighted to customers before they book.',
        },
        progress: ({ avgResponseTimeMinutes }) => {
            if (!Number.isFinite(avgResponseTimeMinutes) || avgResponseTimeMinutes <= 0) {
                return { current: 0, detail: 'No response data yet' };
            }
            const capped = Math.max(0, Math.min(100, Math.round(((60 - avgResponseTimeMinutes) / 55) * 100)));
            return {
                current: capped,
                detail: `${avgResponseTimeMinutes.toFixed(1)} min average response`,
            };
        },
        unlocked: ({ avgResponseTimeMinutes }) => Number.isFinite(avgResponseTimeMinutes) && avgResponseTimeMinutes > 0 && avgResponseTimeMinutes < 5,
    },
    {
        code: 'NEWLY_VERIFIED',
        name: 'Newly Verified',
        weight: 5,
        icon: 'shield_person',
        accent: 'emerald',
        description: 'Recently verified providers get an initial trust signal while building history.',
        requirementText: 'Verified account with fewer than 5 completed jobs',
        benefit: {
            title: 'Verification Badge',
            description: 'Your verified status is shown clearly while you build early momentum.',
        },
        progress: ({ verified, completedJobs }) => ({
            current: verified ? Math.max(0, Math.round((1 - Math.min(completedJobs, 5) / 5) * 100)) : 0,
            detail: verified ? `${completedJobs}/5 jobs before this badge expires` : 'Complete verification to unlock',
        }),
        unlocked: ({ verified, completedJobs }) => verified === true && completedJobs < 5,
    },
    {
        code: 'EXPERT_SELLER',
        name: 'Expert Seller',
        weight: 20,
        icon: 'military_tech',
        accent: 'purple',
        description: 'Reach elite consistency with volume, quality, and reliability.',
        requirementText: '50 completed jobs, 4.7+ rating, 97% completion rate',
        benefit: {
            title: 'Premium Support',
            description: 'Unlock a stronger profile signal and faster operational support.',
        },
        progress: ({ completedJobs, averageRating, completionRate }) => ({
            current: Math.min(100, Math.round(Math.min((completedJobs / 50) * 100, (averageRating / 4.7) * 100, (completionRate / 97) * 100))),
            detail: `${completedJobs}/50 jobs · ${averageRating.toFixed(1)} rating · ${completionRate.toFixed(1)}% completion`,
        }),
        unlocked: ({ completedJobs, averageRating, completionRate }) => completedJobs >= 50 && averageRating >= 4.7 && completionRate >= 97,
    },
];

const DEFAULT_ACCENT = 'slate';

const buildMetrics = (provider) => {
    const stats = provider?.stats || {};
    const averageRating = Number(stats.averageRating || 0);
    const completedJobs = Number(stats.completedJobs || 0);
    const rawCompletionRate = Number(stats.completionRate || 0);
    const completionRate = rawCompletionRate <= 1 ? rawCompletionRate * 100 : rawCompletionRate;
    const avgResponseTimeMinutes = Number(stats.avgResponseTimeMinutes || 0);
    const rankingScore = Number(stats.rankingScore || 0);

    return {
        averageRating,
        completedJobs,
        completionRate,
        avgResponseTimeMinutes,
        rankingScore,
        verified: Boolean(provider?.verified),
    };
};

const getLevelLabel = (count) => {
    if (count >= 5) return 'Super Seller';
    if (count >= 4) return 'Level 4';
    if (count >= 3) return 'Level 3';
    if (count >= 2) return 'Level 2';
    if (count >= 1) return 'Level 1';
    return 'Level 0';
};

const buildRankLabel = (rankPosition, totalProviders) => {
    if (!totalProviders) return 'New';
    return `Rank #${rankPosition}`;
};

const toBadgePayload = (definition, metrics) => {
    const unlocked = definition.unlocked(metrics);
    const progress = definition.progress(metrics);

    return {
        code: definition.code,
        name: definition.name,
        icon: definition.icon,
        accent: definition.accent || DEFAULT_ACCENT,
        description: definition.description,
        requirementText: definition.requirementText,
        unlocked,
        progressPercent: unlocked ? 100 : Math.max(0, Math.min(100, Number(progress.current || 0))),
        progressDetail: progress.detail,
        benefit: definition.benefit,
        weight: definition.weight,
    };
};

export const ensureDefaultBadges = async () => {
    for (const definition of BADGE_DEFINITIONS) {
        await Badge.findOneAndUpdate(
            { code: definition.code },
            { code: definition.code, name: definition.name, weight: definition.weight },
            { upsert: true, returnDocument: 'after' }
        );
    }
};

export const recalculateProviderBadges = async (providerId) => {
    const provider = await ServiceProvider.findById(providerId);
    if (!provider) return null;

    await ensureDefaultBadges();
    const badges = await Badge.find({ isDeleted: false, code: { $in: BADGE_DEFINITIONS.map((item) => item.code) } });
    const badgeIdByCode = new Map(badges.map((badge) => [badge.code, badge._id]));
    const metrics = buildMetrics(provider);

    provider.badges = BADGE_DEFINITIONS
        .filter((definition) => definition.unlocked(metrics))
        .map((definition) => badgeIdByCode.get(definition.code))
        .filter(Boolean);

    await provider.save();
    return provider;
};

export const recalculateAllBadges = async () => {
    const providers = await ServiceProvider.find({ isDeleted: false }).select('_id');
    for (const provider of providers) {
        await recalculateProviderBadges(provider._id);
    }
};

export const listProviderBadges = async (userId) => {
    await ensureDefaultBadges();
    const provider = await ServiceProvider.findOne({ userId, isDeleted: false }).populate('badges');

    if (!provider) {
        return {
            summary: {
                unlockedCount: 0,
                totalCount: BADGE_DEFINITIONS.length,
                completionPercent: 0,
                currentLevel: 'Level 0',
                nextMilestone: BADGE_DEFINITIONS[0]?.name || 'N/A',
                rankLabel: 'New',
                rankPosition: 0,
                totalProviders: 0,
            },
            active: [],
            locked: BADGE_DEFINITIONS.map((definition) => ({
                ...toBadgePayload(definition, buildMetrics(null)),
                unlocked: false,
            })),
            benefits: [],
        };
    }

    const metrics = buildMetrics(provider);
    const allBadges = BADGE_DEFINITIONS.map((definition) => toBadgePayload(definition, metrics)).sort((a, b) => b.weight - a.weight);
    const active = allBadges.filter((badge) => badge.unlocked);
    const locked = allBadges.filter((badge) => !badge.unlocked);
    const badgeDocs = await Badge.find({ isDeleted: false, code: { $in: active.map((badge) => badge.code) } }).select('_id code');
    const storedBadgeIds = (provider.badges || []).map((badge) => String(badge._id || badge));
    const computedBadgeIds = badgeDocs.map((badge) => String(badge._id));

    if (
        storedBadgeIds.length !== computedBadgeIds.length
        || storedBadgeIds.some((badgeId) => !computedBadgeIds.includes(badgeId))
    ) {
        provider.badges = badgeDocs.map((badge) => badge._id);
        await provider.save();
    }

    const [totalProviders, betterRankedProviders] = await Promise.all([
        ServiceProvider.countDocuments({ isDeleted: false }),
        ServiceProvider.countDocuments({ isDeleted: false, 'stats.rankingScore': { $gt: metrics.rankingScore } }),
    ]);

    const unlockedCount = active.length;
    const totalCount = allBadges.length;
    const nextMilestone = locked[0]?.name || 'All badges unlocked';
    const rankPosition = betterRankedProviders + 1;

    return {
        summary: {
            unlockedCount,
            totalCount,
            completionPercent: totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0,
            currentLevel: getLevelLabel(unlockedCount),
            nextMilestone,
            rankLabel: buildRankLabel(rankPosition, totalProviders),
            rankPosition,
            totalProviders,
        },
        metrics: {
            averageRating: metrics.averageRating,
            completedJobs: metrics.completedJobs,
            completionRate: Number(metrics.completionRate.toFixed(1)),
            avgResponseTimeMinutes: Number(metrics.avgResponseTimeMinutes.toFixed(1)),
            verified: metrics.verified,
        },
        active,
        locked,
        benefits: active.map((badge) => ({
            code: badge.code,
            title: badge.benefit.title,
            description: badge.benefit.description,
            accent: badge.accent,
            icon: badge.icon,
        })),
    };
};
