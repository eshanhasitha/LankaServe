# Render Deployment

1. Create a new Web Service from your Git repository.
2. Build command: `npm install`.
3. Start command: `npm start`.
4. Add all `.env.example` keys in Render environment settings.
5. Set `NODE_ENV=production`.
6. Add persistent logging and health check path `/api/health`.
