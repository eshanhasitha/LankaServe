import { signAccessToken, verifyAccessToken, signRefreshToken, parseRefreshToken } from '../../src/utils/tokens.js';

describe('Token utility', () => {
    it('should sign and verify access token correctly', () => {
        const payload = { sub: 'user123', role: 'customer' };
        const token = signAccessToken(payload);
        expect(token).toBeDefined();

        const decoded = verifyAccessToken(token);
        expect(decoded.sub).toBe('user123');
        expect(decoded.role).toBe('customer');
    });

    it('should sign and parse refresh token correctly', () => {
        const payload = { sub: 'user456', role: 'provider' };
        const refreshObj = signRefreshToken(payload);

        expect(refreshObj.token).toBeDefined();
        expect(refreshObj.tokenHash).toBeDefined();
        expect(typeof refreshObj.token).toBe('string');

        const parsed = parseRefreshToken(refreshObj.token);
        expect(parsed.payload.sub).toBe('user456');
        expect(parsed.payload.role).toBe('provider');
        expect(parsed.tokenHash).toBe(refreshObj.tokenHash);
    });

    it('should throw error for invalid refresh token format', () => {
        expect(() => parseRefreshToken('invalidtokenformat')).toThrow('Invalid refresh token format');
    });
});
