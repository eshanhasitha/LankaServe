import { calculateRankingScore } from '../../src/services/ranking.service.js';

describe('Ranking service utility', () => {
    it('should calculate provider ranking score based on weighted metrics', () => {
        const mockProvider = {
            stats: {
                averageRating: 4.8,
                completedJobs: 15,
                completionRate: 0.95,
                responseSpeedScore: 0.9,
                badgeWeight: 10,
            },
        };

        const score = calculateRankingScore(mockProvider);
        // (4.8 * 5) + (15 * 2) + (0.95 * 3) + (0.9 * 2) + 10
        // 24 + 30 + 2.85 + 1.8 + 10 = 68.65
        expect(score).toBeCloseTo(68.65, 2);
    });

    it('should handle missing or empty stats safely', () => {
        const score = calculateRankingScore({});
        expect(score).toBe(0);
    });
});
