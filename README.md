# AccoFinder API

AccoFinder is an accommodation finder backend powered by Node.js, Express, and MongoDB. It provides a RESTful API and WebSocket support for managing users, properties (houses/rooms), bookings, agent applications, property verification, disputes, notifications, payments (PayChangu mobile money), and intelligent recommendations.

## Features

- **Authentication & Roles:** JWT + session-based user authentication (secured with bcrypt), with `ADMIN` / `AGENT` / `CLIENT` roles.
- **Token refresh:** Access tokens are short-lived (~15 min); `POST /api/auth/refresh` issues new access tokens.
- **Property Management:** APIs to create, filter, and find houses/accommodations, with inline room creation.
- **Agent workflow:** Agent accounts, agent applications (apply → approve/reject → promoted to `AGENT`), agent activation/deactivation.
- **Property verification:** Queue + approve/reject flow, with verification history.
- **Payments:** PayChangu mobile money charge, verify, and cancel flows.
- **Disputes & Notifications:** Escalation tracking and per-user notifications.
- **Recommendations:** Personalized property matching for clients (skeleton).
- **Media:** S3 uploads with presigned URLs.
- **Real-time Comms:** Socket.io integration ready for live features.

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB running locally or remotely
- PayChangu developer account (mobile money API keys)
- (Optional) AWS S3 bucket for media, Google OAuth credentials, Stripe keys

## Environment Variables

Create a `.env` file in the root of the project with the following keys:

```env
PORT=3000
NODE_ENV=development
MODE_ENV=development

# Database
MONGO_URL_CLASTER=mongodb://localhost:27017/accofinder_db
MONGO_URI_CAMPUSS=mongodb://localhost:27017/accofinder_db

# Auth / JWT
JWT_ACCESS_SECRET=your_jwt_access_secret
SESSION_SECRET=0d8f3b1a2c3d4e5f6g7h8i9j0k1l2m3n
SALT_ROUNDS=10

# Session & Oauth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/callback/google

# Bootstrap admin
ADMIN_ID=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...

# Payments (PayChangu)
PAYCHANGU_SECRET_KEY=sk_test_...
PAYCHANGU_CURRENCY=MWK

# Optional integrations
STRIPE_SECRET_KEY=sk_test_...
AWS_BUCKET=...
AWS_REGION=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
BIRD_API_KEY=...
```

## Running the Application

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Development Server** (auto-reloads with `nodemon`):
   ```bash
   npm run start:dev
   ```

3. **Start the Production Server:**
   ```bash
   npm run start
   ```

## Project Structure

```text
src/
├── config/        # Environment and Database configuration
├── controllers/   # Route handler functions containing the core business logic
├── middleware/    # Express middlewares (Auth protection, Error handling)
├── models/        # Mongoose database schemas
├── routes/        # Express router definitions mapping paths to controllers
├── sockets/       # Socket.IO handlers
├── utils/         # Helpers, token generation, upload config, state machines
└── validators/    # Request payload validation mechanisms
```

## Conventions

- **Authentication:** Protected routes accept either the session cookie (web) or a `Bearer <accessToken>` header (mobile/API).
- **Responses:** Every response uses the shape `{ "success": bool, "message": string, "data": ... | null }`.
- **Identifiers:** Documents are returned with both `_id` and an `id` alias. Most list endpoints return `data` as a JSON array; `GET /api/house-listing/` returns `data: { "properties": [...], "pagination": {...} }`.
- **Roles:** Route guards reference `ADMIN`, `AGENT`, `CLIENT`. `LANDLORD`/`STUDENT` appear in some guards but are not assignable role values yet — the agent/landlord distinction is currently tracked via `assignedArea` on the user.

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| POST | `/register` | Register a new user | No | - |
| POST | `/login` | Login with email and password | No | - |
| POST | `/logout` | Logout user | No | - |
| POST | `/refresh` | Refresh access token (body: `{ "refreshToken": "..." }`)→ `data.accessToken` | No | - |
| GET | `/check-email` | Check if email exists | No | - |
| GET | `/me` | Get current authenticated user | Yes | All |
| POST | `/otp/request` | Request OTP for verification | No | - |
| POST | `/otp/verify` | Verify OTP | No | - |
| GET | `/google` | Initiate Google OAuth | No | - |
| GET | `/callback/google` | Google OAuth callback | No | - |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| GET | `/` | Get all users | Yes | ADMIN |
| GET | `/:id` | Get user by ID | Yes | ADMIN |
| GET | `/me/profile` | Get current user profile | Yes | All |
| PATCH | `/me/profile` | Update current user profile | Yes | AGENT, CLIENT, ADMIN |
| PATCH | `/:id/promote` | Promote user role (body: `{ "role": "AGENT" \| "CLIENT" \| "ADMIN" }`) | Yes | ADMIN |
| PATCH | `/:id/status` | Activate/deactivate user (body: `{ "isActive": bool }`) | Yes | ADMIN |
| DELETE | `/:id` | Delete user | Yes | ADMIN |

### Agents (`/api/agents`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| GET | `/` | List all agents | Yes | ADMIN |
| GET | `/:agentId` | Get one agent by ID | Yes | ADMIN |
| PATCH | `/:id` | Update agent (body: `{ "assignedArea"?, "commissionRate"? }`) | Yes | ADMIN |
| PATCH | `/:id/status` | Activate/deactivate agent (body: `{ "isActive": bool }`) | Yes | ADMIN |

Agent records expose `employeeId`, `assignedArea`, `commissionRate`, `isActive`, `firstName`, `lastName`, `email`, `phone`, `createdAt`.

### Agent Applications (`/api/agent-applications`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| POST | `/` | Submit an agent application | Yes | CLIENT, ADMIN |
| GET | `/` | List agent applications | Yes | ADMIN |
| PATCH | `/:id/approve` | Approve application (promotes user to `AGENT`) | Yes | ADMIN |
| PATCH | `/:id/reject` | Reject application | Yes | ADMIN |

Applications expose `applicationId`, `preferredArea`, `appliedDate`, `status` (`Pending`/`Approved`/`Rejected`), `firstName`, `lastName`, `email`, `phone`.

### Property Verification (`/api/property`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| POST | `/:id` | Save a verification for property `:id` | Yes | AGENT, ADMIN |
| GET | `/history` | Get verification history | Yes | ADMIN |
| PATCH | `/:propertyId` | Approve/reject a property | Yes | AGENT, ADMIN |

Verification `status` uses the app's int encoding on the wire: `0` = Approved, `1` = Rejected, `2` = Pending. Approving sets `Property.verificationStatus` to `VERIFIED`; rejecting sets it to `REJECTED`. Optional body fields: `agentId`, `notes`, `verifiedAt`, `status`.

### Properties (`/api/properties` or `/api/house-listing`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| GET | `/` | Query/filter properties | No | - |
| GET | `/:id` | Get property by ID | No | - |
| POST | `/` | Create a new property | Yes | LANDLORD*, AGENT, ADMIN |
| PUT | `/:id` | Update property | Yes | LANDLORD*, AGENT, ADMIN |
| DELETE | `/:id` | Delete property | Yes | LANDLORD*, AGENT, ADMIN |

*`LANDLORD` is reserved in the guards but not yet assignable — effectively `AGENT`/`ADMIN`.

### Rooms (`/api/rooms`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| GET | `/` | Query/filter rooms (see filters below) | No | - |
| GET | `/property/:propertyId` | Get all rooms for a property | No | - |
| GET | `/:id` | Get room by ID | No | - |
| POST | `/` | Create new room | Yes | LANDLORD*, AGENT, ADMIN |
| PUT | `/:id` | Update room details | Yes | LANDLORD*, AGENT, ADMIN |
| DELETE | `/:id` | Delete room | Yes | LANDLORD*, AGENT, ADMIN |

`GET /api/rooms/` query filters: `propertyId`, `roomType` (`SINGLE`/`DOUBLE`/`TRIPLE`, case-insensitive), `minPrice`, `maxPrice`, `isAvailable`, `page` (default 1), `limit` (default 10).

### Bookings (`/api/bookings`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| POST | `/` | Create booking reservation | Yes | CLIENT, ADMIN |
| GET | `/` | Get all bookings | Yes | LANDLORD*, AGENT, ADMIN |
| GET | `/:id` | Get booking by ID | Yes | All |
| PATCH | `/:id` | Update booking details | Yes | CLIENT, ADMIN |
| PATCH | `/:id/confirm` | Confirm booking | Yes | LANDLORD*, AGENT, ADMIN |
| PATCH | `/:id/cancel` | Cancel booking | Yes | CLIENT, LANDLORD*, ADMIN |
| DELETE | `/:id` | Delete booking record | Yes | ADMIN |

### Disputes (`/api/disputes`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| POST | `/` | Raise new dispute | Yes | All |
| GET | `/` | Get all disputes | Yes | ADMIN, AGENT |
| GET | `/:id` | Get dispute by ID | Yes | ADMIN, AGENT, CLIENT |
| PATCH | `/:id/resolve` | Resolve dispute | Yes | ADMIN, AGENT |
| DELETE | `/:id` | Delete dispute | Yes | ADMIN |

### Notifications (`/api/notifications`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| POST | `/` | Create notification | No | - |
| GET | `/` | Get all notifications | No | - |
| GET | `/unread` | Get unread notifications | No | - |
| GET | `/count` | Get notification count | No | - |
| GET | `/:id` | Get notification by ID | No | - |
| PATCH | `/:id/read` | Mark notification as read | No | - |
| PATCH | `/read/all` | Mark all notifications as read | No | - |
| DELETE | `/:id` | Delete single notification | No | - |
| DELETE | `/` | Delete all notifications | No | - |

### Payments (`/api/payments`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| GET | `/operators` | Get supported mobile money operators | Yes | All |
| POST | `/process/:bookingId` | Process mobile money payment for a booking | Yes | CLIENT |
| GET | `/verify/:chargeId` | Verify payment status | Yes | All |
| GET | `/details/:chargeId` | Get charge details from PayChangu | Yes | All |
| GET | `/user/:userId` | Get latest payment for a user (or a payment by its id) | Yes | All |
| POST | `/cancel` | Cancel a payment (booking returns to `Pending`, room released) | Yes | All |

### Media/Uploads (`/media`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|----------------|-------|
| POST | `/upload` | Upload media file (multipart `file`; jpg/jpeg/png/webp/gif, ≤10 MB) | Yes | All |
| GET | `/presigned-url` | Get S3 presigned URL | Yes | All |
| GET | `/property/:propertyId` | Get media by property | No | - |
| DELETE | `/:id` | Delete media | Yes | All |

## Request payloads

### Create a booking

```json
{
  "roomId": "<24-hex room id>",      // required
  "bookingDate": "2026-09-01T10:00:00.000Z", // optional, defaults to now
  "amount": 120000,                   // required, > 0
  "commissionAmount": 12000,          // optional, default 0
  "clientId": "<24-hex user id>"      // optional, falls back to authenticated user
}
```

### Create a room

```json
{
  "propertyId": "<24-hex property id>",  // required
  "type": "SINGLE",                      // required; normalized to upper-case (SINGLE/DOUBLE/TRIPLE)
  "price": 45000,                        // optional, default 0
  "available": true                      // optional, default true
}
```

### Process a mobile money payment

```json
{
  "bookingId": "<24-hex booking id>",  // required
  "amount": 120000,                    // required (number or string)
  "phoneNumber": "+265991234567",      // optional; falls back to the booking client's phone
  "operatorRefId": "<operator ref>"    // optional; falls back to the default operator ref
}
```

### Activate/deactivate a user or agent

```json
{ "isActive": true }
```

### Promote a user

```json
{ "role": "AGENT" }
```

## User Roles

- **ADMIN:** Full system access, manage users, agents, applications, verification queue, disputes, and payouts.
- **AGENT:** Manage own property listings, bookings, and verification.
- **CLIENT:** Browse properties and place bookings; can apply to become an agent.

(`LANDLORD` and `STUDENT` appear in some route guards but are not assignable role values yet.)