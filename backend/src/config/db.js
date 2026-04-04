import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (!env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is required to connect to MongoDB. Set it in .env or your environment.');
  }

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed. Ensure MongoDB is running and MONGO_URI is correct.');
    throw error;
  }
}