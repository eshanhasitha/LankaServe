import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  API_PREFIX: process.env.API_PREFIX || '/api',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lankaserve',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',').map((x) => x.trim()),
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
};
