# Cloudflare Deployment (Backend)

This backend is a long-running Node.js server (Express + MongoDB + cron + Socket.IO).
Cloudflare Workers are for serverless functions and cannot run this type of app directly without major rewrites (e.g., converting to edge functions, which loses cron/Socket.IO features).

Recommended architecture: Deploy to a VPS/server and use Cloudflare Tunnel to expose it securely without public ports.

## Prerequisites

- VPS/server (e.g., DigitalOcean Droplet, AWS EC2, Linode) with Node.js installed.
- Domain added to Cloudflare (nameservers updated).
- `cloudflared` installed on your VPS.
- Backend code cloned and `.env` configured on VPS.

## 1) Deploy Backend to VPS

1. SSH into your VPS.
2. Clone repo: `git clone https://github.com/eshanhasitha/LankaServe.git && cd LankaServe/backend`.
3. Install dependencies: `npm install`.
4. Create `.env` with production variables (see below).
5. Start app: `npm start` (or use PM2: `npm install -g pm2 && pm2 start ecosystem.config.js`).
6. Verify locally: `curl http://localhost:5000/api/health` (should return healthy JSON).

## 2) Set Up Cloudflare Tunnel

1. On your VPS, install `cloudflared`: Follow [Cloudflare docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/).
2. Authenticate: `cloudflared tunnel login`.
3. Create tunnel: `cloudflared tunnel create api-tunnel`.
4. Create config file `/etc/cloudflared/config.yaml`:
   ```
   tunnel: api-tunnel
   credentials-file: /root/.cloudflared/api-tunnel.json
   ingress:
     - hostname: api.yourdomain.com
       service: http://localhost:5000
     - service: http_status:404
   ```
5. Run tunnel: `cloudflared tunnel run api-tunnel` (or as service for persistence).

## 3) Connect Domain in Cloudflare

1. In Cloudflare Dashboard, go to Zero Trust > Networks > Tunnels.
2. Add the tunnel and map `api.yourdomain.com` to it.
3. In DNS, ensure `api.yourdomain.com` points to Cloudflare (CNAME to your domain or tunnel endpoint).
4. SSL/TLS: Set to `Full (strict)`, enable `Always Use HTTPS`.

## 4) Cloudflare Settings

- **Caching**: Bypass for `api.yourdomain.com/*`.
- **Network**: WebSockets enabled.
- **Security**: WAF on, rate limiting on auth paths.

## 5) Environment Variables (Production)

Minimum required:

- `NODE_ENV=production`
- `MONGO_URI=...`
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`

Recommended:

- `CORS_ORIGINS=https://your-frontend-domain.com`
- `PORT=5000`
- `API_PREFIX=/api`

## 6) Verify

- `https://api.yourdomain.com/api/health` should return healthy.
- Test API and Socket.IO.

## Scaling Note

Cron jobs run in the Node process. Scale carefully or move cron to a separate service.
