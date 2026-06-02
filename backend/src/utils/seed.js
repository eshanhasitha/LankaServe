import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Badge from '../models/Badge.model.js';

const run = async () => {
    await mongoose.connect(env.MONGO_URI);

    const badges = [
        { code: 'TOP_RATED', name: 'Top Rated', weight: 15 },
        { code: 'RELIABLE', name: 'Reliable', weight: 10 },
        { code: 'FAST_RESPONDER', name: 'Fast Responder', weight: 8 },
        { code: 'NEWLY_VERIFIED', name: 'Newly Verified', weight: 5 },
    ];

    for (const badge of badges) {
        await Badge.findOneAndUpdate({ code: badge.code }, badge, { upsert: true, returnDocument: 'after' });
    }

    console.log('Seed completed');
    await mongoose.connection.close();
};

run().catch(async (error) => {
    console.error('Seed failed:', error.message);
    if (mongoose.connection.readyState) await mongoose.connection.close();
    process.exit(1);
});
