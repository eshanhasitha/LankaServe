# LankaServe Backend API Documentation

Welcome to the **LankaServe** RESTful API documentation. LankaServe is a modern, location-based service marketplace platform connecting customers with verified local service providers across Sri Lanka.

For the full detailed backend documentation, refer to [backend/docs/API_DOCUMENTATION.md](file:///d:/LankaServe/backend/docs/API_DOCUMENTATION.md).

---

## Quick Reference Summary

- **Base URL**: `http://localhost:5000/api/v1`
- **Interactive Swagger UI**: `http://localhost:5000/api-docs`
- **Authentication**: `Authorization: Bearer <accessToken>`

### Primary API Route Groups:
1. `/api/v1/auth` - User/Provider Firebase Auth Login & Registration
2. `/api/v1/admin-auth` - Admin Login & Password Management
3. `/api/v1/users` - Customer & Profile Settings
4. `/api/v1/providers` - Provider Profiles, Verification, Badges, & Search
5. `/api/v1/jobs` - Job Request & Lifecycle State Machine
6. `/api/v1/reviews` - Ratings & Reviews
7. `/api/v1/payments` - Payment Verification & Status
8. `/api/v1/notifications` - User Push Notifications & Admin Broadcasts
9. `/api/v1/messages` - Direct Messaging & Support Threads
10. `/api/v1/support-requests` - Customer Support Tickets
11. `/api/v1/uploads` - Multipart Image & Document Uploads
12. `/api/v1/analytics` - System Heatmap & Service Metrics (Admin)
13. `/api/v1/admin` - Administrative Tools, Backups, Ads & Moderation
