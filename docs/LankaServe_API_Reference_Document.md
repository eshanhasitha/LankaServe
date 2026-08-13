# LankaServe – Full API Reference Document

**System**: LankaServe Backend REST API  
**Version**: 1.0.0  
**Base URL**: `http://localhost:5000/api/v1`  
**Interactive Docs**: `http://localhost:5000/api-docs`

---

## Standard Response Envelope

Every API response follows this uniform JSON structure:

```json
{
  "success": true | false,
  "message": "Human-readable status",
  "data": { ... } | null,
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 } | null,
  "errorCode": null | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST"
}
```

**Authentication Header (required for protected routes):**

```
Authorization: Bearer <accessToken>
```

---

---

# Appendix C – API Reference

---

## C.1 Authentication APIs

> **Base path**: `/api/v1/auth`  
> **Rate limit**: 5 requests per 15 minutes per IP (authLimiter)

---

### C.1.1 Registration

**Endpoint**: `POST /api/v1/auth/register`  
**Auth**: None  
**Description**: Register a new customer or service provider using a Firebase ID token. On success, creates a User document (and ServiceProvider document if role is provider), writes an audit log, and returns JWT session tokens.

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| firebaseIdToken | string | ✅ | Valid Firebase ID token from Google/Firebase auth |
| role | string | ❌ | `customer` or `provider`. Default: `customer` |
| providerProfile | object | ❌ | Only applicable when role is `provider` |
| providerProfile.categories | string[] | ❌ | Service category names (e.g. `["Plumbing"]`) |
| providerProfile.bio | string | ❌ | Short biography |
| providerProfile.yearsExperience | number | ❌ | Years of experience (min 0) |
| providerProfile.serviceArea | string | ❌ | Geographic service area description |
| providerProfile.location | GeoPoint | ❌ | `{ type: "Point", coordinates: [lng, lat] }` |

**Example Request**:
```json
{
  "firebaseIdToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "role": "customer"
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "abc123...:eyJhbGci...",
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Kamal Perera",
      "email": "kamal@gmail.com",
      "role": "customer",
      "language": "en"
    }
  },
  "pagination": null,
  "errorCode": null
}
```

**Error Responses**:

| Code | errorCode | Cause |
|---|---|---|
| 400 | BAD_REQUEST | Missing firebaseIdToken or validation error |
| 500 | — | Only Gmail addresses accepted; Firebase token invalid |

---

### C.1.2 Login

**Endpoint**: `POST /api/v1/auth/login`  
**Auth**: None  
**Description**: Authenticate an existing user using a Firebase ID token. Creates a new session and returns access and refresh tokens.

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| firebaseIdToken | string | ✅ | Valid Firebase ID token |

**Example Request**:
```json
{
  "firebaseIdToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "abc123...:eyJhbGci...",
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Kamal Perera",
      "email": "kamal@gmail.com",
      "role": "customer"
    }
  },
  "pagination": null,
  "errorCode": null
}
```

---

### C.1.3 Logout

**Endpoint**: `POST /api/v1/auth/logout`  
**Auth**: `requireAuth` (Bearer token)  
**Description**: Revoke the current refresh token to terminate the user session. The access token also becomes invalid upon expiry.

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| refreshToken | string | ✅ | Active refresh token to revoke |

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "pagination": null,
  "errorCode": null
}
```

---

### C.1.4 Token Refresh (Token Validation)

**Endpoint**: `POST /api/v1/auth/refresh`  
**Auth**: None  
**Description**: Validate a refresh token and issue a new access token. The refresh token is verified by hash lookup in the database, ensuring it has not been revoked.

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| refreshToken | string | ✅ | Active refresh token |

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "newtoken...:eyJhbGci..."
  },
  "pagination": null,
  "errorCode": null
}
```

**Error Responses**:

| Code | errorCode | Cause |
|---|---|---|
| 400 | BAD_REQUEST | Missing refreshToken |
| 401 | UNAUTHORIZED | Refresh token invalid, revoked, or expired |

---

---

## C.2 User APIs

> **Base path**: `/api/v1/users`  
> **Auth**: `requireAuth` for all endpoints

---

### C.2.1 Get Profile

**Endpoint**: `GET /api/v1/users/me`  
**Auth**: Required (any role)  
**Description**: Retrieve the authenticated user's full profile.

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Kamal Perera",
    "email": "kamal@gmail.com",
    "role": "customer",
    "language": "en",
    "profileImage": "",
    "bio": "",
    "district": "Colombo",
    "city": "Dehiwala",
    "location": { "type": "Point", "coordinates": [79.8612, 6.9271] },
    "favorites": [],
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "pagination": null,
  "errorCode": null
}
```

---

### C.2.2 Update Profile

**Endpoint**: `PUT /api/v1/users/me`  
**Auth**: Required (any role)  
**Description**: Update the authenticated user's profile information.

**Request Body (all fields optional)**:

| Field | Type | Validation | Description |
|---|---|---|---|
| name | string | min 2, max 100 | Display name |
| language | string | `en`, `si`, `ta` | Preferred language |
| profileImage | string | URL string | Profile photo URL |
| bio | string | — | Short biography |
| district | string | — | Sri Lanka district |
| city | string | — | City name |
| location | GeoPoint | — | `{ type: "Point", coordinates: [lng, lat] }` |

**Example Request**:
```json
{
  "name": "Kamal Perera",
  "district": "Colombo",
  "city": "Dehiwala",
  "language": "si"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile updated",
  "data": { ... updated user object ... },
  "pagination": null,
  "errorCode": null
}
```

---

---

## C.3 Provider APIs

> **Base path**: `/api/v1/providers`

---

### C.3.1 Provider Public Profile

**Endpoint**: `GET /api/v1/providers/:id`  
**Auth**: None  
**Description**: Retrieve a service provider's public profile including stats, badges, and verification status.

**Path Parameters**:

| Parameter | Description |
|---|---|
| id | Provider's User MongoDB ObjectId |

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Provider profile",
  "data": {
    "_id": "...",
    "categories": ["Plumbing"],
    "bio": "Experienced plumber",
    "verified": true,
    "availability": "online",
    "stats": {
      "averageRating": 4.8,
      "completedJobs": 23,
      "completionRate": 0.95,
      "responseSpeedScore": 0.9
    },
    "badges": [ ... ],
    "location": { "type": "Point", "coordinates": [79.8612, 6.9271] }
  },
  "pagination": null,
  "errorCode": null
}
```

---

### C.3.2 Search Providers

**Endpoint**: `GET /api/v1/providers`  
**Auth**: None  
**Description**: Public search and discovery of providers with filtering and geo-proximity ranking.

**Query Parameters**:

| Parameter | Type | Description |
|---|---|---|
| search | string | Keyword search (name, bio, categories) |
| category | string | Filter by service category |
| verified | boolean | Filter by verification status |
| availability | string | `online` or `offline` |
| district | string | Filter by district |
| city | string | Filter by city |
| lat | number | User latitude for proximity sort |
| lng | number | User longitude for proximity sort |
| maxDistance | number | Radius in meters (default 50000) |
| page | integer | Page number (default 1) |
| limit | integer | Results per page (default 10, max 100) |

---

### C.3.3 Apply as Provider

**Endpoint**: `POST /api/v1/providers/apply`  
**Auth**: Required (any role)  
**Description**: Submit provider application. Creates a ServiceProvider profile linked to the authenticated user.

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| categories | string[] | ✅ | Service categories |
| bio | string | ❌ | Provider biography |
| district | string | ❌ | District |
| city | string | ❌ | City |
| yearsExperience | number | ❌ | Years of experience |
| verificationDocs | string[] | ❌ | Document URLs |
| location | GeoPoint | ❌ | Geo coordinates |

---

### C.3.4 Verification

**Endpoint**: `PUT /api/v1/providers/verification`  
**Auth**: Required (Provider only)  
**Description**: Submit identity verification documents for admin review. Required to obtain verified badge.

**Request Body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| legalName | string | ✅ | min 2, max 120 chars |
| nicNumber | string | ✅ | NIC number, min 5 max 40 |
| phone | string | ✅ | Phone number |
| address | string | ✅ | Full address |
| serviceArea | string | ✅ | Service coverage area |
| businessRegistrationNumber | string | ❌ | Optional business reg |
| notes | string | ❌ | Additional notes, max 500 |
| verificationDocs | string[] | ❌ | Uploaded document URLs, max 5 |

---

### C.3.5 Provider Ranking

**Endpoint**: `GET /api/v1/providers/analytics`  
**Auth**: Required (Provider only)  
**Description**: Provider ranking analytics. Ranking score is computed as:

```
Score = (averageRating × 5) + (completedJobs × 2) + (completionRate × 3) + (responseSpeedScore × 2) + badgeWeight
```

**Success Response (200 OK)** includes: ranking score, response efficiency, completion rate, average rating, jobs breakdown.

---

### C.3.6 Badges

**Endpoint**: `GET /api/v1/providers/badges`  
**Auth**: Required (Provider only)  
**Description**: Retrieve earned badges and progress towards unlockable badges.

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Badges",
  "data": {
    "earned": [
      { "name": "Fast Responder", "icon": "speed", "weight": 5 }
    ],
    "progress": [
      { "name": "10 Jobs", "current": 6, "target": 10, "detail": "6/10 jobs completed" }
    ]
  }
}
```

---

---

## C.4 Job APIs

> **Base path**: `/api/v1/jobs`  
> **Auth**: `requireAuth` for all endpoints

**Job Status State Machine**:

```
pending ──► accepted ──► arrived ──► ongoing ──► completed ──► paid
              │
              └──► cancelled (by customer)
```

---

### C.4.1 Create Job

**Endpoint**: `POST /api/v1/jobs`  
**Auth**: Required (Customer only)  
**Description**: Create a new job request. Optionally direct it to a preferred provider.

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| title | string | ✅ | Job title |
| description | string | ✅ | Detailed description |
| category | string | ✅ | Service category |
| price | number | ✅ | Agreed price (min 0) |
| location | GeoPoint | ✅ | Job site coordinates |
| images | string[] | ❌ | Uploaded image URLs |
| preferredProviderId | string | ❌ | 24-char ObjectId of preferred provider |

**Example Request**:
```json
{
  "title": "Fix leaking roof",
  "description": "Roof tile leaking near master bedroom",
  "category": "Roofing",
  "price": 3500,
  "location": { "type": "Point", "coordinates": [79.8612, 6.9271] }
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Job created",
  "data": {
    "_id": "64f1a2b3...",
    "status": "pending",
    "title": "Fix leaking roof",
    "category": "Roofing",
    "price": 3500
  }
}
```

---

### C.4.2 View Jobs

**Endpoint**: `GET /api/v1/jobs`  
**Auth**: Required (any role)  
**Description**: List authenticated user's jobs. Automatically filters by role — customers see their created jobs; providers see their assigned jobs.

**Query Parameters**:

| Parameter | Description |
|---|---|
| status | Filter by job status |
| page | Page number |
| limit | Results per page |

---

### C.4.3 Accept Job

**Endpoint**: `PUT /api/v1/jobs/:id/accept`  
**Auth**: Required (Provider only)  
**Description**: Provider accepts a pending job. Status changes to `accepted`. A QR token is generated for arrival verification. Records response time in minutes.

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Job accepted",
  "data": {
    "_id": "64f1a2b3...",
    "status": "accepted",
    "acceptedAt": "2025-01-01T00:00:00.000Z",
    "qrToken": "eyJhbGci..."
  }
}
```

---

### C.4.4 Reject Job

**Endpoint**: `PUT /api/v1/jobs/:id/reject`  
**Auth**: Required (Provider only)  
**Description**: Provider declines a direct job request. Status reverts to `pending` with no assigned provider.

---

### C.4.5 Update Job Status

**Endpoint**: `PUT /api/v1/jobs/:id`  
**Auth**: Required (Customer only)  
**Description**: Update job details while still in `pending` status.

**Endpoint**: `PUT /api/v1/jobs/:id/cancel`  
**Auth**: Required (Customer only)  
**Description**: Cancel job. Only allowed while job is in `pending` or `accepted` status.

**Endpoint**: `PUT /api/v1/jobs/:id/start`  
**Auth**: Required (Provider only)  
**Description**: Provider starts work on arrived job. Status changes to `ongoing`.

---

### C.4.6 Complete Job

**Endpoint**: `PUT /api/v1/jobs/:id/complete/provider`  
**Auth**: Required (Provider only)  
**Description**: Provider marks work as complete (`providerCompletion = true`).

**Endpoint**: `PUT /api/v1/jobs/:id/complete/customer`  
**Auth**: Required (Customer only)  
**Description**: Customer confirms job completion (`customerCompletion = true`).

**Endpoint**: `PUT /api/v1/jobs/:id/complete/finalize`  
**Auth**: Required  
**Description**: Finalize job when both provider and customer have confirmed. Status changes to `completed`. Triggers provider stats recalculation, badge evaluation, and ranking score update.

---

---

## C.5 QR APIs

> **Base path**: `/api/v1/providers` and `/api/v1/jobs`  
> **Auth**: Required

---

### C.5.1 Generate QR Token

**Endpoint**: `GET /api/v1/providers/:jobId/qr`  
**Auth**: Required (Provider only)  
**Description**: Generate or retrieve an active JWT-based QR verification token for a given job. Token encodes `jobId` and `providerId`, is hashed with SHA-256, and stored against the job record. If a valid unexpired token exists, it is returned without regeneration.

**Path Parameters**:

| Parameter | Description |
|---|---|
| jobId | MongoDB ObjectId of the job |

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "QR token",
  "data": {
    "token": "eyJhbGci...",
    "tokenHash": "sha256hashvalue...",
    "expiresAt": "2025-01-01T01:00:00.000Z"
  }
}
```

---

### C.5.2 Validate QR & Record Verification

**Endpoint**: `PUT /api/v1/jobs/:id/arrival/scan`  
**Auth**: Required (Customer only)  
**Description**: Customer scans provider's QR token to confirm provider arrival at job site. System validates the JWT token, verifies the SHA-256 hash against the database, checks token expiry and usage status. On success, marks job as `arrived`, records `arrivedAt` timestamp, and creates a QR audit log entry.

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| token | string | ✅ | QR JWT token scanned from provider's device |

**Example Request**:
```json
{
  "token": "eyJhbGci..."
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Arrival confirmed",
  "data": {
    "_id": "64f1a2b3...",
    "status": "arrived",
    "arrivedAt": "2025-01-01T00:30:00.000Z"
  }
}
```

**Error Responses**:

| Code | Cause |
|---|---|
| 400 | Token expired, already used, or hash mismatch |
| 403 | User is not the job customer |
| 404 | Job not found |

---

---

## C.6 Review APIs

> **Base path**: `/api/v1/reviews`

---

### C.6.1 Create Review

**Endpoint**: `POST /api/v1/reviews`  
**Auth**: Required (Customer only)  
**Description**: Submit a rating and review for a completed job. One review per job per customer is enforced. On creation, provider stats, badges, and ranking score are automatically recalculated. A push notification is sent to the provider.

**Request Body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| jobId | string | ✅ | Job must be `completed` or `paid` |
| rating | number | ✅ | 1–5 integer star rating |
| comment | string | ❌ | Optional text comment |

**Example Request**:
```json
{
  "jobId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "rating": 5,
  "comment": "Excellent work, arrived on time!"
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Review created",
  "data": {
    "_id": "...",
    "jobId": "...",
    "providerId": "...",
    "customerId": "...",
    "rating": 5,
    "comment": "Excellent work, arrived on time!",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### C.6.2 View Reviews

**Endpoint**: `GET /api/v1/reviews/provider/:providerId`  
**Auth**: None  
**Description**: List all reviews for a specific provider with pagination.

**Query Parameters**: `page`, `limit`

**Endpoint**: `GET /api/v1/reviews/job/:jobId`  
**Auth**: Required (Customer or Provider of that job)  
**Description**: Retrieve the review for a specific job.

**Endpoint**: `GET /api/v1/reviews/job/:jobId/mine`  
**Auth**: Required (Customer only)  
**Description**: Retrieve the authenticated customer's own review for a specific job.

---

---

## C.7 Messaging APIs

> **Base path**: `/api/v1/messages`  
> **Auth**: `requireAuth` for all endpoints

---

### C.7.1 Conversations

**Endpoint**: `GET /api/v1/messages/conversations`  
**Auth**: Required (any role)  
**Description**: Retrieve a list of all active conversation threads for the authenticated user, ordered by most recent message. Each thread includes the other participant's details, last message, and unread count.

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Conversations",
  "data": [
    {
      "threadId": "...",
      "participant": { "name": "Kamal Perera", "profileImage": "" },
      "lastMessage": "I'll be there by 3pm",
      "unreadCount": 2,
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### C.7.2 Messages (Thread)

**Endpoint**: `GET /api/v1/messages/thread/:userId`  
**Auth**: Required  
**Description**: Retrieve paginated message history between the authenticated user and a specific user.

**Query Parameters**: `page`, `limit`, `jobId` (optional filter)

---

### C.7.3 Send Message

**Endpoint**: `POST /api/v1/messages/send`  
**Auth**: Required  
**Description**: Send a direct message to another user. Optionally associate it with a job.

**Request Body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| receiverId | string | ✅ | Recipient's User ObjectId |
| content | string | ✅ | Message content (min 1 char) |
| jobId | string | ❌ | Related job ObjectId |

---

### C.7.4 Mark Thread as Read

**Endpoint**: `PUT /api/v1/messages/read/:threadId`  
**Auth**: Required  
**Description**: Mark all messages in a conversation thread as read for the authenticated user.

---

### C.7.5 Contact Support Agent

**Endpoint**: `POST /api/v1/messages/contact-agent`  
**Auth**: Required  
**Description**: Open or continue a support chat thread with the LankaServe support agent system.

**Request Body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| content | string | ✅ | Message content (max 2000 chars) |

---

---

## C.8 Notification APIs

> **Base path**: `/api/v1/notifications`

---

### C.8.1 Notification Retrieval

**Endpoint**: `GET /api/v1/notifications/my`  
**Auth**: Required (any role)  
**Description**: Retrieve the authenticated user's notifications. Supports unread filtering and pagination. Notification types: `job`, `payment`, `system`, `offer`.

**Query Parameters**: `page`, `limit`, `unreadOnly` (optional)

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Notifications",
  "data": [
    {
      "_id": "...",
      "title": "Job Accepted",
      "body": "Provider Kamal has accepted your job.",
      "type": "job",
      "isRead": false,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```

---

### C.8.2 Notification Updates (Mark as Read)

**Endpoint**: `PUT /api/v1/notifications/read/:id`  
**Auth**: Required  
**Description**: Mark a specific notification as read.

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": { "_id": "...", "isRead": true }
}
```

---

### C.8.3 Admin Broadcast Notification

**Endpoint**: `POST /api/v1/notifications/admin/broadcast`  
**Auth**: Admin Bearer token  
**Description**: Broadcast a push notification to all active platform users via Firebase Cloud Messaging.

**Request Body**:

| Field | Type | Required | Description |
|---|---|---|---|
| title | string | ✅ | Notification title |
| body | string | ✅ | Notification body text |
| type | string | ❌ | `system` `job` `payment` `offer` (default: `system`) |

---

---

## C.9 Admin APIs

> **Base path**: `/api/v1/admin`  
> **Auth**: Admin Bearer token required for all endpoints

---

### C.9.1 User Management

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/admin/users` | GET | List all platform users with search, pagination, role filters |
| `/api/v1/admin/users/:id/deactivate` | PUT | Deactivate (soft-suspend) a user account |

**Query Parameters (GET /admin/users)**:

| Parameter | Description |
|---|---|
| search | Email or name search |
| role | `customer`, `provider`, `admin` |
| page, limit | Pagination |

---

### C.9.2 Provider Management & Verification

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/admin/providers` | GET | List all providers with verification status filters |
| `/api/v1/admin/providers/:id/verify` | PUT | Approve or reject provider verification |

**PUT /admin/providers/:id/verify body**:

| Field | Type | Description |
|---|---|---|
| status | string | `verified` or `rejected` |
| rejectionReason | string | Reason (when rejecting) |

---

### C.9.3 Job Monitoring

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/admin/jobs` | GET | Monitor all platform jobs with status, category, date filters |
| `/api/v1/admin/qr-logs` | GET | View all QR scan verification event records |

---

### C.9.4 Support Management

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/admin/support-requests` | GET | List all customer support tickets with status, priority filters |
| `/api/v1/admin/support-requests/:id` | GET | View single support ticket details |
| `/api/v1/admin/support-requests/:id` | PUT | Update status, priority, and admin notes |
| `/api/v1/admin/support-chats/conversations` | GET | List all user support chat threads |
| `/api/v1/admin/support-chats/thread/:userId` | GET | View support conversation with specific user |
| `/api/v1/admin/support-chats/send` | POST | Send admin reply in support chat |
| `/api/v1/admin/support-chats/read/:threadId` | PUT | Mark support thread as read by admin |

**PUT /admin/support-requests/:id body**:

| Field | Type | Values |
|---|---|---|
| status | string | `open`, `in_progress`, `resolved`, `closed` |
| priority | string | `low`, `normal`, `high`, `urgent` |
| adminNotes | string | Internal notes, max 5000 chars |

---

### C.9.5 Advertisements

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/admin/ads` | GET | List all promotional advertisements |
| `/api/v1/admin/ads` | POST | Create new advertisement |
| `/api/v1/admin/ads/:id` | PUT | Update advertisement details |
| `/api/v1/admin/ads/:id` | DELETE | Remove advertisement |

---

### C.9.6 Reports & Analytics

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/admin/reports` | GET | Financial and audit report rows |
| `/api/v1/admin/audit-logs` | GET | System security and admin action audit log |
| `/api/v1/analytics/overview` | GET | Platform KPI dashboard metrics |
| `/api/v1/analytics/heatmap` | GET | Geographic demand heatmap data |
| `/api/v1/analytics/services` | GET | Service category booking volume distribution |

---

---

# Appendix D – Testing

## D.1 Backend Unit Tests

**Command**:
```powershell
cd backend
npm run test:unit
```

**Test Suites and Coverage**:

| Test File | Tests | Description |
|---|---|---|
| `tests/unit/qrHelper.test.js` | 1 | QR JWT token generation, hash generation, and token verification |
| `tests/unit/tokens.test.js` | 3 | Access token signing/verification, refresh token sign/parse/error handling |
| `tests/unit/pagination.test.js` | 4 | Pagination computation, bounds clamping, metadata generation |
| `tests/unit/password.test.js` | 1 | Bcrypt password hashing and match comparison |
| `tests/unit/ranking.test.js` | 2 | Provider ranking score algorithm, empty stats safety |

**Result: 5 Test Suites | 11 Tests | All PASS**

---

## D.2 Integration Tests

**Command**:
```powershell
cd backend
npm run test:integration
```

**Test Suites and Coverage**:

| Test File | Tests | Description |
|---|---|---|
| `tests/integration/auth.test.js` | 1 | User registration → login → token refresh full flow |
| `tests/integration/jobflow.test.js` | 1 | Complete job lifecycle (pending → accepted → arrived → ongoing → completed) |
| `tests/integration/user-provider.test.js` | 4 | User profile CRUD, provider availability toggle, provider search |

**Result: 3 Test Suites | 6 Tests | All PASS**

---

## D.3 Authentication Tests

**Command**:
```powershell
cd backend
npm run test:integration -- tests/integration/auth.test.js
```

**Scenarios Covered**:

| Scenario | Endpoint | Expected Status |
|---|---|---|
| Register new user | POST /api/auth/register | 201 |
| Login with valid token | POST /api/auth/login | 200 |
| Refresh access token | POST /api/auth/refresh | 200 |

---

## D.4 QR Testing

**Command**:
```powershell
cd backend
npm run test:unit -- tests/unit/qrHelper.test.js
```

**Scenarios Covered**:

| Scenario | Expected Outcome |
|---|---|
| Generate QR bundle | Returns `token`, `tokenHash`, `expiresAt` |
| Verify QR token payload | `jobId` and `providerId` decoded correctly |
| Integration: Provider generates QR via `/providers/:jobId/qr` | Returns token and expiry |
| Integration: Customer scans via `/jobs/:id/arrival/scan` | Job status → `arrived` |

---

## D.5 Job Lifecycle Testing

**Command**:
```powershell
cd backend
npm run test:integration -- tests/integration/jobflow.test.js
```

**Full State Machine Verified**:

| Step | Endpoint | Status Transition |
|---|---|---|
| Login (Customer & Provider) | POST /api/auth/login | — |
| Create Job | POST /api/jobs | → `pending` |
| Browse available jobs | GET /api/providers/browse-jobs | — |
| Accept job | PUT /api/jobs/:id/accept | → `accepted` |
| View provider jobs | GET /api/providers/jobs | — |
| Scan QR arrival | PUT /api/jobs/:id/arrival/scan | → `arrived` |
| Start job | PUT /api/jobs/:id/start | → `ongoing` |
| Provider completes | PUT /api/jobs/:id/complete/provider | providerCompletion = true |
| Customer confirms | PUT /api/jobs/:id/complete/customer | customerCompletion = true |
| Finalize | PUT /api/jobs/:id/complete/finalize | → `completed` |

---

## D.6 Web Testing

**Customer Web App**:
```powershell
cd frontend/apps/web
npm test
```

| Test File | Tests | Description |
|---|---|---|
| `src/lib/help-bot.test.ts` | 4 | Support bot query matching |
| `src/App.routes.test.tsx` | 8 | Route protection, redirects, page rendering |

**Result: 2 Test Suites | 12 Tests | All PASS**

---

**Admin Web App**:
```powershell
cd frontend/apps/admin
npm test
```

| Test File | Tests | Description |
|---|---|---|
| `src/App.routes.test.tsx` | 3 | Login redirect, form rendering, unknown route fallback |

**Result: 1 Test Suite | 3 Tests | All PASS**

---

## D.7 Authorization Testing

**Scenarios Verified**:

| Test Scenario | Endpoint | Token Role | Expected Response |
|---|---|---|---|
| Customer accessing provider-only route | PUT /api/providers/availability | customer | 403 Forbidden |
| Provider accessing customer-only route | POST /api/jobs | provider (via Jobs controller role check) | 403 Forbidden |
| Unauthenticated request | GET /api/users/me | none | 401 Unauthorized |
| Admin endpoint with user token | GET /api/admin/dashboard | customer | 401 Unauthorized |
| Invalid/expired token | GET /api/users/me | expired JWT | 401 Unauthorized |

---

---

# Appendix E – User Interface Screenshots

> **Note**: The sections below define the expected screenshot categories for UI documentation. Replace each placeholder with actual screenshots captured during system demonstration.

---

## E.1 Customer Interface

### E.1.1 Login
*Screenshot: Customer Login Page — Firebase Google Sign-In authentication screen*

### E.1.2 Home (Dashboard)
*Screenshot: Customer Home Page — Hero section, featured providers, recent jobs summary*

### E.1.3 Provider Search
*Screenshot: Provider Search Page — Filter panel (category, location, rating), provider cards grid*

### E.1.4 Provider Profile
*Screenshot: Provider Profile Page — Provider photo, rating, stats, badges, reviews, booking button*

### E.1.5 Service Request (Post a Job)
*Screenshot: Post a Service Page — Job title, description, category, price, location picker form*

### E.1.6 Job Tracking (My Jobs)
*Screenshot: Customer My Jobs Page — Job list with status badges, timeline progress indicator*

### E.1.7 Job Details
*Screenshot: Customer Job Details Page — Full job card, status timeline, provider info, action buttons*

### E.1.8 QR Scanning
*Screenshot: QR Scan Interface — Camera view or QR code display for arrival verification*

### E.1.9 Review Submission
*Screenshot: Review Page — Star rating selector, comment text area, submit button*

---

## E.2 Provider Interface

### E.2.1 Login
*Screenshot: Provider Login Page — Firebase authentication screen*

### E.2.2 Dashboard
*Screenshot: Provider Dashboard — Active jobs count, earnings summary, rating card, quick actions*

### E.2.3 Provider Profile (My Profile)
*Screenshot: Provider Profile Edit Page — Categories, bio, years experience, location, availability toggle*

### E.2.4 Available Jobs (Browse Jobs)
*Screenshot: Browse Jobs Page — Open job listings with category, distance, price filters*

### E.2.5 Assigned Jobs (My Jobs)
*Screenshot: Provider My Jobs Page — Active and completed job list with status badges*

### E.2.6 Job Details
*Screenshot: Provider Job Detail Page — Customer info, job description, location, action buttons (Accept/Reject/Start)*

### E.2.7 QR Code Display
*Screenshot: QR Generation Page — Generated QR code for customer scanning with job reference*

### E.2.8 Completion
*Screenshot: Job Completion Confirmation — Provider marks completion with confirmation button*

---

## E.3 Admin Interface

### E.3.1 Dashboard
*Screenshot: Admin Dashboard — Platform statistics, user counts, active jobs, revenue KPIs*

### E.3.2 Users
*Screenshot: Admin Users Page — User list table with search, role filter, deactivate buttons*

### E.3.3 Providers
*Screenshot: Admin Providers Page — Provider list with verification status badges*

### E.3.4 Verification
*Screenshot: Provider Verification Detail — NIC info, documents preview, Approve/Reject controls*

### E.3.5 Jobs
*Screenshot: Admin Jobs Page — All platform jobs with status filters, category breakdown*

### E.3.6 Advertisements
*Screenshot: Admin Ads Page — Advertisement list with create/edit/delete controls*

### E.3.7 Support
*Screenshot: Admin Support Page — Support request tickets, priority labels, status management*

### E.3.8 Reports & Analytics
*Screenshot: Admin Reports Page — Financial summary tables, analytics charts, heatmap view*

---

## E.4 Mobile Interface (Flutter App)

### E.4.1 Login
*Screenshot: Mobile Login Screen — Google Sign-In button, app branding*

### E.4.2 Home
*Screenshot: Mobile Home Screen — Category quick access, nearby providers, active job card*

### E.4.3 Service Discovery
*Screenshot: Mobile Provider Search Screen — Map view or list view with provider cards*

### E.4.4 Job Management
*Screenshot: Mobile Job Screen — Active job status card, timeline indicator*

### E.4.5 QR Scanner
*Screenshot: Mobile QR Scanner Screen — Camera live feed with scan overlay for arrival verification*

### E.4.6 Notifications
*Screenshot: Mobile Notifications Screen — Notification list with type icons, timestamps, read/unread states*

### E.4.7 Language Selection
*Screenshot: Mobile Language Selection Screen — English / Sinhala / Tamil options*

### E.4.8 Profile
*Screenshot: Mobile Profile Screen — User details, favorites, settings, logout button*

---

*Document generated from LankaServe backend source code analysis.*  
*Last updated: 2026-08-10*
