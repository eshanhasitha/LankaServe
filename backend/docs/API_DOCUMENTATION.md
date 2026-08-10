# LankaServe Backend API Documentation

Welcome to the **LankaServe** RESTful API documentation. LankaServe is a modern, location-based service marketplace platform connecting customers with verified local service providers across Sri Lanka.

---

## Table of Contents
1. [Overview & Base URLs](#1-overview--base-urls)
2. [Authentication & Security](#2-authentication--security)
3. [Standard Response Envelope & Errors](#3-standard-response-envelope--errors)
4. [Rate Limiting](#4-rate-limiting)
5. [API Endpoint Modules](#5-api-endpoint-modules)
   - [5.1 Authentication (`/api/v1/auth`)](#51-authentication-apiv1auth)
   - [5.2 Admin Authentication (`/api/v1/admin-auth`)](#52-admin-authentication-apiv1admin-auth)
   - [5.3 Users (`/api/v1/users`)](#53-users-apiv1users)
   - [5.4 Service Providers (`/api/v1/providers`)](#54-service-providers-apiv1providers)
   - [5.5 Jobs & Lifecycle (`/api/v1/jobs`)](#55-jobs--lifecycle-apiv1jobs)
   - [5.6 Reviews & Ratings (`/api/v1/reviews`)](#56-reviews--ratings-apiv1reviews)
   - [5.7 Payments (`/api/v1/payments`)](#57-payments-apiv1payments)
   - [5.8 Notifications & Broadcasts (`/api/v1/notifications`)](#58-notifications--broadcasts-apiv1notifications)
   - [5.9 Messages & Chat (`/api/v1/messages`)](#59-messages--chat-apiv1messages)
   - [5.10 Support Requests (`/api/v1/support-requests`)](#510-support-requests-apiv1support-requests)
   - [5.11 File Uploads (`/api/v1/uploads`)](#511-file-uploads-apiv1uploads)
   - [5.12 Platform Analytics (`/api/v1/analytics`)](#512-platform-analytics-apiv1analytics)
   - [5.13 Administration (`/api/v1/admin`)](#513-administration-apiv1admin)

---

## 1. Overview & Base URLs

- **Default Local Server Base URL**: `http://localhost:5000`
- **API Version Prefix**: `/api/v1`
- **Interactive Swagger UI**: `http://localhost:5000/api-docs`
- **Content Type**: `application/json` (except file upload endpoints which use `multipart/form-data`)

### Server Health Check
- `GET /` - Root health endpoint returning server running status.
- `GET /api/v1/health` - Sub-system health check returning `{ "status": "healthy" }`.

---

## 2. Authentication & Security

LankaServe uses a dual authentication system:
1. **Firebase Authentication (Customer & Provider Identity)**:
   - Users authenticate with Firebase on Mobile/Web client and obtain a `firebaseIdToken`.
   - Client sends token to `/api/v1/auth/login` or `/api/v1/auth/register`.
   - Server verifies the Firebase token, creates or retrieves the User record, and returns LankaServe JWT `accessToken` (short-lived) and `refreshToken` (long-lived).

2. **JWT Bearer Token (Session Management & Admin Access)**:
   - Client passes `accessToken` in HTTP Header for protected endpoints:
     `Authorization: Bearer <accessToken>`
   - Roles: `customer`, `provider`, `admin`, `super_admin`.

---

## 3. Standard Response Envelope & Errors

All API responses follow a uniform JSON structure.

### Success Response Example (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Kamal Perera"
  },
  "pagination": null,
  "errorCode": null
}
```

### Paginated Response Example
```json
{
  "success": true,
  "message": "Providers fetched successfully",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  },
  "errorCode": null
}
```

### Standard Error Response Example (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "message": "Invalid credentials or token expired",
  "data": null,
  "pagination": null,
  "errorCode": "UNAUTHORIZED"
}
```

### Common Error Codes
- `UNAUTHORIZED`: Missing or invalid Bearer token / expired session (HTTP 401).
- `FORBIDDEN`: User role does not have required permissions (HTTP 403).
- `NOT_FOUND`: Resource not found (HTTP 404).
- `BAD_REQUEST`: Input validation failure (Joi schema errors) (HTTP 400).
- `DB_UNAVAILABLE`: Database connection temporary error (HTTP 503).
- `TOO_MANY_REQUESTS`: Rate limit exceeded (HTTP 429).

---

## 4. Rate Limiting

- **General API Limiter**: Max 100 requests per 15 minutes window per IP.
- **Authentication Limiter**: Max 5 requests per 15 minutes window for login/register endpoints.

---

## 5. API Endpoint Modules

### 5.1 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
Register a new customer or service provider using a Firebase ID token.
- **Limiter**: `authLimiter`
- **Request Body**:
```json
{
  "firebaseIdToken": "string (required)",
  "role": "customer | provider (optional, default: customer)",
  "providerProfile": {
    "categories": ["Plumbing", "Electrical"],
    "bio": "Experienced plumber in Colombo",
    "yearsExperience": 5,
    "serviceArea": "Western Province",
    "location": {
      "type": "Point",
      "coordinates": [79.8612, 6.9271]
    }
  }
}
```
- **Response**: Returns JWT `accessToken`, `refreshToken`, and user object.

#### `POST /api/v1/auth/login`
Authenticate user using Firebase ID token.
- **Limiter**: `authLimiter`
- **Request Body**:
```json
{
  "firebaseIdToken": "string (required)"
}
```

#### `POST /api/v1/auth/refresh`
Obtain a new access token using a refresh token.
- **Request Body**:
```json
{
  "refreshToken": "string (required)"
}
```

#### `POST /api/v1/auth/logout`
Revoke refresh token and end session.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "refreshToken": "string (required)"
}
```

---

### 5.2 Admin Authentication (`/api/v1/admin-auth`)

#### `POST /api/v1/admin-auth/login`
Admin email and password login.
- **Request Body**:
```json
{
  "email": "admin@lankaserve.lk",
  "password": "secretpassword"
}
```

#### `POST /api/v1/admin-auth/refresh`
Refresh admin access token.

#### `POST /api/v1/admin-auth/logout`
Admin logout and session termination.
- **Headers**: `Authorization: Bearer <adminAccessToken>`

#### `POST /api/v1/admin-auth/change-password`
Update current admin password.
- **Headers**: `Authorization: Bearer <adminAccessToken>`
- **Request Body**: `{ "currentPassword": "old", "newPassword": "new" }`

---

### 5.3 Users (`/api/v1/users`)
Requires `Authorization: Bearer <accessToken>`

#### `GET /api/v1/users/me`
Retrieve authenticated user profile details.

#### `PUT /api/v1/users/me`
Update user profile details.
- **Request Body**:
```json
{
  "name": "string (min 2, max 100)",
  "language": "en | si | ta",
  "profileImage": "string URL",
  "bio": "string",
  "district": "Colombo",
  "city": "Dehiwala",
  "location": {
    "type": "Point",
    "coordinates": [79.8612, 6.9271]
  }
}
```

#### `POST /api/v1/users/favorites/:providerId`
Add service provider to user's favorites list.

#### `DELETE /api/v1/users/favorites/:providerId`
Remove service provider from favorites.

---

### 5.4 Service Providers (`/api/v1/providers`)

#### `GET /api/v1/providers`
Public search and discovery for service providers.
- **Query Parameters**:
  - `search`: Keyword string
  - `category`: Filter by service category
  - `verified`: `true | false`
  - `availability`: `online | offline`
  - `district`, `city`: Geographic location filters
  - `lat`, `lng`: User coordinates for proximity sorting
  - `maxDistance`: Maximum search distance in meters (default 50000)
  - `page`, `limit`: Pagination parameters

#### `GET /api/v1/providers/:id`
Public view of provider profile including ratings, reviews count, badges, and stats.

#### `POST /api/v1/providers/apply`
Submit provider application (Requires Auth).
- **Request Body**: Categories, bio, experience, location, verification document URLs.

#### `GET /api/v1/providers/me`
Provider's own profile and verification status (Provider only).

#### `PUT /api/v1/providers/me`
Update provider business profile details (Provider only).

#### `PUT /api/v1/providers/verification`
Submit NIC, Legal Name, Address, and Verification documents for badge verification (Provider only).

#### `PUT /api/v1/providers/availability`
Toggle online/offline status (`{ "availability": "online" | "offline" }`).

#### `GET /api/v1/providers/dashboard`
Get provider dashboard summary metrics (Jobs count, earnings total, rating).

#### `GET /api/v1/providers/analytics`
Provider analytics data (completion rate, response speed, weekly breakdown).

#### `GET /api/v1/providers/badges`
Provider earned badges and progress towards unlockable badges.

#### `GET /api/v1/providers/jobs`
List provider's active and historical jobs.

#### `GET /api/v1/providers/browse-jobs`
Browse open pending jobs within provider's categories and location radius.

#### `GET /api/v1/providers/job-requests`
Direct job requests sent specifically to this provider.

#### `GET /api/v1/providers/earnings`
Provider earnings overview and payout records.

#### `GET /api/v1/providers/suggestions`
Recommended action suggestions to improve ranking and job bookings.

#### `GET /api/v1/providers/:jobId/qr`
Get active QR code token for arrival verification scan at job site.

---

### 5.5 Jobs & Lifecycle (`/api/v1/jobs`)
Requires `Authorization: Bearer <accessToken>`

#### Job Lifecycle State Machine:
`pending` ➔ `accepted` ➔ `arrived` ➔ `ongoing` ➔ `completed` ➔ `paid` (or `cancelled`)

#### `POST /api/v1/jobs` (Customer Only)
Create a new job request.
- **Request Body**:
```json
{
  "title": "Fix Leaking Roof",
  "description": "Roof tile leaking near master bedroom",
  "category": "Roofing",
  "price": 3500,
  "location": {
    "type": "Point",
    "coordinates": [79.8612, 6.9271]
  },
  "images": ["https://res.cloudinary.com/..."],
  "preferredProviderId": "64f1a2b3c4d5e6f7a8b9c0d1 (optional)"
}
```

#### `PUT /api/v1/jobs/:id` (Customer Only)
Update pending job details.

#### `GET /api/v1/jobs`
List jobs for authenticated user or provider with pagination & status filters.

#### `GET /api/v1/jobs/:id`
Get full job details including customer, provider, status timestamps, and location.

#### `PUT /api/v1/jobs/:id/accept` (Provider Only)
Provider accepts job request. Status changes to `accepted`.

#### `PUT /api/v1/jobs/:id/reject` (Provider Only)
Provider declines direct job request.

#### `PUT /api/v1/jobs/:id/cancel` (Customer Only)
Cancel pending or accepted job.

#### `PUT /api/v1/jobs/:id/arrival/scan` (Customer Only)
Customer scans provider's QR code token upon arrival. Status changes to `arrived`.

#### `PUT /api/v1/jobs/:id/start` (Provider Only)
Provider starts job work. Status changes to `ongoing`.

#### `PUT /api/v1/jobs/:id/complete/provider` (Provider Only)
Provider marks job as completed.

#### `PUT /api/v1/jobs/:id/complete/customer` (Customer Only)
Customer confirms job completion.

#### `PUT /api/v1/jobs/:id/complete/finalize`
Finalize job status transition to `completed`.

---

### 5.6 Reviews & Ratings (`/api/v1/reviews`)

#### `GET /api/v1/reviews/provider/:providerId`
Get list of customer reviews for a specific provider.

#### `GET /api/v1/reviews/job/:jobId`
Get review left for a specific job.

#### `GET /api/v1/reviews/job/:jobId/mine`
Get authenticated customer's review for job.

#### `POST /api/v1/reviews` (Customer Only)
Submit rating and review for completed job.
- **Request Body**:
```json
{
  "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "rating": 5,
  "comment": "Excellent plumbing work!"
}
```

#### `DELETE /api/v1/reviews/:id` (Admin Only)
Delete inappropriate or spam review.

---

### 5.7 Payments (`/api/v1/payments`)

#### `POST /api/v1/payments/:jobId/init`
Initialize payment for job completion.

#### `PUT /api/v1/payments/:jobId/provider-paid` (Provider Only)
Provider records payment receipt confirmation.

#### `PUT /api/v1/payments/:jobId/customer-confirm` (Customer Only)
Customer confirms payment release.

#### `PUT /api/v1/payments/:jobId/admin-verify` (Admin Only)
Admin manually verifies and releases payment escrow.

#### `GET /api/v1/payments/my` (Provider Only)
Get provider payment transactions and status history.

---

### 5.8 Notifications & Broadcasts (`/api/v1/notifications`)

#### `GET /api/v1/notifications/my`
Get list of notifications for authenticated user.

#### `PUT /api/v1/notifications/read/:id`
Mark notification as read.

#### `POST /api/v1/notifications/admin/broadcast` (Admin Only)
Broadcast push notification to all platform users.
- **Request Body**:
```json
{
  "title": "System Maintenance",
  "body": "Scheduled update at midnight",
  "type": "system | job | payment | offer"
}
```

---

### 5.9 Messages & Chat (`/api/v1/messages`)
Requires `Authorization: Bearer <accessToken>`

#### `GET /api/v1/messages/conversations`
List user's active messaging threads.

#### `POST /api/v1/messages/send`
Send direct message to another user or provider.
- **Request Body**: `{ "receiverId": "...", "content": "Hello", "jobId": "..." }`

#### `POST /api/v1/messages/contact-agent`
Contact automated AI or support agent.

#### `GET /api/v1/messages/thread/:userId`
Fetch complete message history with specific user.

#### `PUT /api/v1/messages/read/:threadId`
Mark message thread as read.

---

### 5.10 Support Requests (`/api/v1/support-requests`)

#### `GET /api/v1/support-requests/my`
List submitted support tickets.

#### `GET /api/v1/support-requests/:id`
Get support ticket status, messages, and attachments.

#### `POST /api/v1/support-requests`
Create new support ticket.
- **Categories**: `Payment Issue`, `Technical Problem`, `Account Access`, `Verification Help`, `Job Issue`, `Other`
- **Request Body**:
```json
{
  "category": "Payment Issue",
  "subject": "Payment Delay",
  "message": "Payment for job #123 has not reached bank account",
  "attachments": [
    { "url": "https://...", "name": "receipt.pdf", "type": "pdf" }
  ]
}
```

---

### 5.11 File Uploads (`/api/v1/uploads`)
Requires `multipart/form-data` with key `image` (Max file size: 5MB).

#### `POST /api/v1/uploads/profile-image`
Upload user profile photo to Cloudinary/storage.

#### `POST /api/v1/uploads/support-attachment`
Upload attachment image/document for support ticket.

#### `POST /api/v1/uploads/provider-verification`
Upload verification document (NIC copy, business license, certificate).

---

### 5.12 Platform Analytics (`/api/v1/analytics`)
Requires `Authorization: Bearer <adminAccessToken>`

#### `GET /api/v1/analytics/heatmap`
Geographic demand and service activity density coordinates.

#### `GET /api/v1/analytics/overview`
High-level platform KPIs (total users, active jobs, gross transaction value).

#### `GET /api/v1/analytics/services`
Distribution and volume of service bookings by category.

---

### 5.13 Administration (`/api/v1/admin`)
Requires `Authorization: Bearer <adminAccessToken>`

#### Admin Management Endpoints:
- `GET /api/v1/admin/dashboard` - Platform admin dashboard metrics
- `GET /api/v1/admin/users` - Search and manage all user accounts
- `PUT /api/v1/admin/users/:id/deactivate` - Deactivate / suspend user account
- `GET /api/v1/admin/providers` - Manage provider applications and profiles
- `PUT /api/v1/admin/providers/:id/verify` - Approve/reject provider verification status
- `GET /api/v1/admin/reports` - Audit reports & financial rows
- `GET /api/v1/admin/jobs` - Inspect all system jobs
- `GET /api/v1/admin/reviews` - Moderation queue for reviews
- `GET /api/v1/admin/qr-logs` - Inspect QR scan verification logs
- `GET /api/v1/admin/audit-logs` - System security and admin action logs
- `GET /api/v1/admin/backups` - Database backup history (Google Drive)
- `POST /api/v1/admin/backups` - Trigger immediate database backup
- `POST /api/v1/admin/backups/:id/restore` - Restore database from backup snapshot
- `GET/POST/PUT/DELETE /api/v1/admin/ads` - Manage promotional banners and advertisements
- `GET/POST/PUT/DELETE /api/v1/admin/badge-rules` - Configure provider automated badge rules
- `GET/POST/PUT /api/v1/admin/broadcasts` - Manage platform system broadcasts
- `GET/PUT /api/v1/admin/support-requests` - Process and resolve customer support tickets
- `GET/POST/PUT /api/v1/admin/support-chats` - Manage direct support chat threads
