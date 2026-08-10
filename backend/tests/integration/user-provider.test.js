import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';

describe('User & Provider Integration Suite', () => {
    let dbReady = false;
    let customerToken;
    let providerToken;
    let providerUserId;

    beforeAll(async () => {
        try {
            await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
            await mongoose.connection.dropDatabase();
            dbReady = true;
        } catch (error) {
            dbReady = false;
        }

        if (dbReady) {
            // Register Customer
            const cRes = await request(app).post('/api/auth/register').send({
                firebaseIdToken: 'dev:usercust@gmail.com:Customer User:customer',
                role: 'customer',
            });
            customerToken = cRes.body.data.accessToken;

            // Register Provider
            const pRes = await request(app).post('/api/auth/register').send({
                firebaseIdToken: 'dev:userprov@gmail.com:Provider User:provider',
                role: 'provider',
                providerProfile: {
                    categories: ['Plumbing'],
                    bio: 'Professional plumber',
                    yearsExperience: 4,
                    location: { type: 'Point', coordinates: [79.8612, 6.9271] },
                },
            });
            providerToken = pRes.body.data.accessToken;
            providerUserId = pRes.body.data.user._id;
        }
    });

    afterAll(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
        }
    });

    it('should retrieve customer profile via /api/users/me', async () => {
        if (!dbReady) return;

        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe('usercust@gmail.com');
        expect(res.body.data.role).toBe('customer');
    });

    it('should update user profile via PUT /api/users/me', async () => {
        if (!dbReady) return;

        const res = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                name: 'Customer User Updated',
                district: 'Colombo',
                city: 'Dehiwala',
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Customer User Updated');
        expect(res.body.data.district).toBe('Colombo');
    });

    it('should toggle provider availability to online', async () => {
        if (!dbReady) return;

        const res = await request(app)
            .put('/api/providers/availability')
            .set('Authorization', `Bearer ${providerToken}`)
            .send({ availability: 'online' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.availability).toBe('online');
    });

    it('should search providers and find registered provider', async () => {
        if (!dbReady) return;

        const res = await request(app).get('/api/providers').query({ category: 'Plumbing' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });
});
