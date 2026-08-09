# LankaServe

LankaServe is a multi-application service marketplace platform. The repository contains the backend API, customer/provider web app, admin dashboard, and Flutter mobile app.


## Repository Structure


```text
LankaServe/
+-- backend/              # Node.js + Express API
+-- frontend/
|   +-- apps/
|       +-- web/          # Public/customer React app
|       +-- admin/        # Admin React dashboard
+-- mobile/               # Flutter mobile application
+-- docs/                 # Product/admin documentation and UI references
+-- README.md
```

## Tech Stack

- Backend: Node.js, Express, MongoDB/Mongoose, Socket.IO, Firebase Admin, JWT auth
- Web apps: React, TypeScript, Vite, Tailwind CSS
- Mobile: Flutter, Firebase, Google Sign-In, Flutter Map
- Testing: Jest/Supertest for backend, Vitest for web, Flutter test for mobile
- Deployment support: Docker, PM2, Nginx, Render, MongoDB Atlas

## Prerequisites

Install the tools needed for the part of the project you are working on:

- Node.js and npm
- MongoDB connection string or MongoDB Atlas database
- Flutter SDK for the mobile app
- Firebase project credentials for authentication, notifications, and admin services
- GitHub CLI if you want to create or merge pull requests from the terminal

## Backend Setup

```powershell
cd backend
npm install
npm run dev
```

Useful backend commands:

```powershell
npm start
npm run seed
npm run create-admin
npm test
npm run test:unit
npm run test:integration
```

Backend API entry points:

- Root: `/`
- API root: `/api`
- Health check: `/api/health`

Deployment and testing notes are in:

- `backend/docs/testing-guide.md`
- `backend/docs/deployment/render.md`
- `backend/docs/deployment/mongodb-atlas.md`

## Web App Setup

```powershell
cd frontend/apps/web
npm install
npm run dev
```

Other commands:

```powershell
npm run build
npm run preview
npm test
```

## Admin Dashboard Setup

```powershell
cd frontend/apps/admin
npm install
npm run dev
```

The admin dev server runs on port `5174`.

Other commands:

```powershell
npm run build
npm run preview
```

## Mobile App Setup

```powershell
cd mobile
flutter pub get
flutter run
```

Useful mobile commands:

```powershell
flutter analyze
flutter test
flutter build apk
```

## Environment Configuration

Create environment files for each app before running locally.

Backend environment values usually include:

- MongoDB connection string
- JWT access and refresh secrets
- Firebase service account credentials
- Cloudinary credentials
- CORS origins
- API port

Frontend and mobile environment values usually include:

- Backend API base URL
- Firebase client configuration
- Map or location service configuration, if required

Do not commit real secrets or production credentials.

## Testing

Run backend tests:

```powershell
cd backend
npm test
```

Run web tests:

```powershell
cd frontend/apps/web
npm test
```

Run mobile tests:

```powershell
cd mobile
flutter test
```

## Deployment

Backend deployment options included in the repository:

```powershell
cd backend
docker-compose up --build -d
```

or: 

```powershell
cd backend
pm2 start ecosystem.config.js
```

See the backend deployment docs for Render, MongoDB Atlas, Nginx, and backup guidance.

## Git Workflow

Create a feature branch:

```powershell
git checkout -b docs
git add .
git commit -m "Update readme"
git push -u origin docs
```

Create a pull request from `docs` into `main`:

```powershell
gh pr create --base main --head docs --title "Update readme" --body "Update readme"
```

Merge the pull request:

```powershell
gh pr merge docs --merge
```

Update local `main` after the merge:

```powershell
git checkout main
git pull origin main
```

## Security Notes

- Keep JWT secrets strong and private.
- Keep Firebase service account files out of Git.
- Restrict production CORS origins.
- Use HTTPS in production.
- Rotate credentials if they are exposed.
- Use MongoDB Atlas backups or the provided backend backup scripts.
