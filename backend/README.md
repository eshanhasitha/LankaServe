# LankaServe Backend

Production-ready Node.js backend for LankaServe service marketplace.

## Project Structure

```text
backend/
+-- docs/
�   +-- deployment/
�   +-- postman/
�   +-- testing-guide.md
+-- scripts/
+-- src/
�   +-- config/
�   +-- controllers/
�   +-- cron/
�   +-- middleware/
�   +-- models/
�   +-- routes/
�   +-- services/
�   +-- utils/
+-- tests/
�   +-- integration/
�   +-- unit/
+-- Dockerfile
+-- ecosystem.config.js
+-- nginx.conf
+-- package.json
```

## Installation Steps

1. Install dependencies.
   - `npm install`
2. Copy env file.
   - `cp .env.example .env` (or create manually on Windows)
3. Configure env values.
4. Seed base data.
   - `npm run seed`
5. Start dev server.
   - `npm run dev`

## Provider Job APIs

- `GET /api/providers/jobs`:
  - Provider assigned jobs (supports `status`, `page`, `limit`).
- `GET /api/providers/browse-jobs`:
  - Browse open pending jobs.
  - Supports `category`, `minPrice`, `maxPrice`, `page`, `limit`.
- `GET /api/providers/suggestions`:
  - Suggested pending jobs by provider categories.

## API Base

- Root: `/`
- API root: `/api`
- Health: `/api/health`

## Testing

- Full test: `npm test`
- Unit test: `npm run test:unit`
- Integration test: `npm run test:integration`
- Postman collection: `docs/postman/LankaServe.postman_collection.json`

## Deployment

- Docker: `docker-compose up --build -d`
- PM2: `pm2 start ecosystem.config.js`
- Nginx reverse proxy: `nginx.conf`
- Render guide: `docs/deployment/render.md`
- Cloudflare guide: `docs/deployment/cloudflare.md`
- Atlas guide: `docs/deployment/mongodb-atlas.md`

## Security Checklist

- Use strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- Keep Firebase service account credentials secure
- Enforce HTTPS/TLS at ingress (Nginx/Render)
- Restrict CORS origins in production
- Rotate refresh tokens and revoke on logout
- Use MongoDB Atlas backups with `scripts/backup.sh` / `scripts/backup.ps1`
