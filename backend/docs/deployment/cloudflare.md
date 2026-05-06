# Cloudflare Deployment (Backend)

This backend can be deployed to Cloudflare Workers using the Worker entrypoint at `src/worker.js` and `wrangler.jsonc`.

Use this when you want:
- edge deployment via `wrangler deploy`
- Cron Triggers managed by Cloudflare
- no VPS process manager

## Option A: Deploy as Cloudflare Worker (recommended for this repo state)

### 1) Required files

- `wrangler.jsonc`
- `src/worker.js`

Both are already included in this backend.

### 2) Configure secrets/vars in Cloudflare

Set required secrets for production:

- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

And optional vars as needed:

- `API_PREFIX`
- `CORS_ORIGINS`
- `LOG_LEVEL`
- Firebase/Cloudinary keys if used by your routes

### 3) Deploy

From `backend/`:

```bash
npx wrangler deploy
```

### 4) Verify

- `https://<your-worker-domain>/api/health`
- confirm Cron Triggers are attached in Worker settings

## Option B: Deploy Node server + Cloudflare Tunnel

If you need classic long-running process hosting semantics, use VPS + `cloudflared` tunnel.

High-level:
1. Run backend on VPS (PM2/systemd).
2. Create and run Cloudflare Tunnel.
3. Map `api.yourdomain.com` to tunnel in Cloudflare.

## Notes

- Cron Triggers in Workers run on UTC.
- If a dependency is not Worker-compatible, keep Option B for production until replaced.
