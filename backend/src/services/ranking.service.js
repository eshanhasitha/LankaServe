import ServiceProvider from '../models/ServiceProvider.model.js';

export const calculateRankingScore = (provider) => {
    const s = provider.stats || {};
    return (
        (s.averageRating || 0) * 5 +
        (s.completedJobs || 0) * 2 +
        (s.completionRate || 0) * 3 +
        (s.responseSpeedScore || 0) * 2 +
        (s.badgeWeight || 0)
    );
};

export const recalculateProviderRanking = async (providerId) => {
    const provider = await ServiceProvider.findById(providerId).populate('badges');
    if (!provider) return null;
    const badgeWeight = (provider.badges || []).reduce((sum, b) => sum + (b.weight || 0), 0);
    provider.stats.badgeWeight = badgeWeight;
    provider.stats.rankingScore = calculateRankingScore(provider);
    await provider.save();
    return provider;
};

export const recalculateAllRankings = async () => {
    const providers = await ServiceProvider.find({ isDeleted: false });
    for (const p of providers) {
        await recalculateProviderRanking(p._id);
    }
};
