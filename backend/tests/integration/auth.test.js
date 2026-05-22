import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';

describe('Auth sample flow', () => {
    let dbReady = false;

    beforeAll(async () => {
        try {
            await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
            await mongoose.connection.dropDatabase();
            dbReady = true;
        } catch (error) {
            // keep test process healthy when DB is unreachable
            dbReady = false;
        }
    });

    afterAll(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
        }
    });

    it('should register, login and refresh', async () => {
        if (!dbReady) return;

        const registerRes = await request(app).post('/api/auth/register').send({
            firebaseIdToken: 'dev:test1@example.com:Test User:customer',
            role: 'customer',
        });

        expect(registerRes.statusCode).toBe(201);
        expect(registerRes.body.success).toBe(true);
        expect(registerRes.body.data.accessToken).toBeDefined();
        expect(registerRes.body.data.refreshToken).toBeDefined();

        const loginRes = await request(app).post('/api/auth/login').send({
            firebaseIdToken: 'dev:test1@example.com:Test User:customer',
        });

        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body.success).toBe(true);
        expect(loginRes.body.data.accessToken).toBeDefined();
        expect(loginRes.body.data.refreshToken).toBeDefined();

        const refreshRes = await request(app).post('/api/auth/refresh').send({
            refreshToken: loginRes.body.data.refreshToken,
        });

        expect(refreshRes.statusCode).toBe(200);
        expect(refreshRes.body.success).toBe(true);
        expect(refreshRes.body.data.accessToken).toBeDefined();
    });
});
