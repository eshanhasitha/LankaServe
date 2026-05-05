import { generateSecureQR, verifySecureQR } from '../../src/utils/qr.js';

describe('QR utility', () => {
    it('generates and verifies qr jwt token', () => {
        const bundle = generateSecureQR({ jobId: 'job1', providerId: 'provider1' });
        expect(bundle.token).toBeDefined();
        expect(bundle.tokenHash).toBeDefined();

        const payload = verifySecureQR(bundle.token);
        expect(payload.jobId).toBe('job1');
        expect(payload.providerId).toBe('provider1');
    });
});
