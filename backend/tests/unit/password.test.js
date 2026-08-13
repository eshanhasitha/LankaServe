import { hashPassword, comparePassword } from '../../src/utils/password.js';

describe('Password utility', () => {
    it('should hash password and verify match correctly', async () => {
        const plain = 'secret123!';
        const hash = await hashPassword(plain);
        expect(hash).toBeDefined();
        expect(hash).not.toBe(plain);

        const matches = await comparePassword(plain, hash);
        expect(matches).toBe(true);

        const wrongMatches = await comparePassword('wrongpass', hash);
        expect(wrongMatches).toBe(false);
    });
});
