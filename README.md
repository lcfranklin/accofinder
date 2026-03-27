# AccoFinder API

AccoFinder is an accommodation finder backend powered by Node.js, Express, and MongoDB. It provides a RESTful API and WebSocket support for managing users, properties (houses), disputes, notifications, payments, and intelligent recommendations.

## Features

- **Authentication & Roles:** JWT-based user authentication supporting agents, landlords, clients, and students. (Secured with bcrypt).
- **Property Management:** APIs to create and find houses/accommodations.
- **Disputes:** Issue escalation and dispute tracking capabilities.
- **Notifications:** Inform users dynamically.
- **Recommendations:** Personalized property matching for clients.
- **Payments:** Stripe integration for generating secure checkout sessions.
- **Real-time Comms:** Socket.io integration ready for live features.

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB running locally or remotely
- Stripe Developer Account (for Checkout API keys)

## Environment Variables

Create a `.env` file in the root of the project with the following keys:

```env
PORT=3000
MODE_ENV=development

# Database
MONGO_URL_CAMPUS=mongodb://localhost:27017/accofinder_db
MONGO_URL_CLUSTER=mongodb://localhost:27017/accofinder_db

# JWT Configuration
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRATION=7d

# Session Configuration
SESSION_SECRET=your_session_secret

# Other Configuration
ADMIN_ID=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...

# Payments (Stripe/Paychangu)
STRIPE_SECRET_KEY=sk_test_... 
PAYCHANGU_SECRET_KEY=sk_test_...
```

## Running the Application

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Development Server:**
   This will spin up the server with `nodemon` for auto-reloading.
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
├── services/      # (Deprecated/Merged) Intermediate abstraction layer
├── sockets/       # Socket.IO handlers
├── utils/         # Helpers, token generation, upload config, state machines
└── validaters/    # Request payload validation mechanisms
```

## API Endpoints (Quick Overview)

- **Auth:** `/api/auth/register`, `/api/auth/login`
- **Users:** `/api/users`
- **Houses:** `/api/houses`
- **Disputes:** `/api/disputes`
- **Notifications:** `/api/notifications`
- **Payments:** `/api/payments/create-checkout-session`
