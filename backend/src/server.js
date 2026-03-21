import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

async function start() {
  await connectDB();
  app.listen(env.PORT, () => console.log(`Server on ${env.PORT}`));
}

start();