import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';

describe('Job lifecycle sample flow', () => {
    let dbReady = false;
    let customerToken;
    let providerToken;
    let jobId;
    let qrToken;

    beforeAll(async () => {
        try {
            await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
            await mongoose.connection.dropDatabase();
            dbReady = true;
        } catch (error) {
            dbReady = false;
        }

        if (dbReady) {
            const cLogin = await request(app).post('/api/auth/login').send({ firebaseIdToken: 'dev:customer@example.com:Customer One:customer' });
            customerToken = cLogin.body.data.accessToken;

            const pLogin = await request(app).post('/api/auth/login').send({ firebaseIdToken: 'dev:provider@example.com:Provider One:provider' });
            providerToken = pLogin.body.data.accessToken;
        }
    });

    afterAll(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
        }
    });

    it('should complete lifecycle pending -> completed', async () => {
        if (!dbReady) return;

        const createRes = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                title: 'Fix sink',
                description: 'Kitchen sink leakage',
                category: 'Plumbing',
                location: { type: 'Point', coordinates: [79.8612, 6.9271] },
                price: 2500,
            });

        expect(createRes.statusCode).toBe(201);
        jobId = createRes.body.data._id;

        const browseRes = await request(app)
            .get('/api/providers/browse-jobs')
            .set('Authorization', `Bearer ${providerToken}`);
        expect(browseRes.statusCode).toBe(200);
        expect(Array.isArray(browseRes.body.data)).toBe(true);
        expect(browseRes.body.data.some((j) => j._id === jobId)).toBe(true);

        const acceptRes = await request(app)
            .put(`/api/jobs/${jobId}/accept`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send();

        expect(acceptRes.statusCode).toBe(200);
        qrToken = acceptRes.body.data.qrToken;

        const myJobsRes = await request(app)
            .get('/api/providers/jobs')
            .set('Authorization', `Bearer ${providerToken}`);
        expect(myJobsRes.statusCode).toBe(200);
        expect(Array.isArray(myJobsRes.body.data)).toBe(true);
        expect(myJobsRes.body.data.some((j) => j._id === jobId)).toBe(true);

        const scanRes = await request(app)
            .put(`/api/jobs/${jobId}/arrival/scan`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ token: qrToken });
        expect(scanRes.statusCode).toBe(200);

        const startRes = await request(app)
            .put(`/api/jobs/${jobId}/start`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send();
        expect(startRes.statusCode).toBe(200);

        const pComp = await request(app)
            .put(`/api/jobs/${jobId}/complete/provider`)
            .set('Authorization', `Bearer ${providerToken}`)
            .send();
        expect(pComp.statusCode).toBe(200);

        const cComp = await request(app)
            .put(`/api/jobs/${jobId}/complete/customer`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send();
        expect(cComp.statusCode).toBe(200);

        const finalRes = await request(app)
            .put(`/api/jobs/${jobId}/complete/finalize`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send();
        expect(finalRes.statusCode).toBe(200);
        expect(finalRes.body.data.status).toBe('completed');
    });
});
