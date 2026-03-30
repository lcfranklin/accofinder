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
MONGO_URL_CLASTER=mongodb://localhost:27017/accofinder_db
MONGO_URI_CAMPUSS=mongodb://localhost:27017/accofinder_db

# Session & Oauth Configuration
SESSION_SECRET=0d8f3b1a2c3d4e5f6g7h8i9j0k1l2m3n
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/callback/google

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

- **Auth:** `/api/auth/register`, `/api/auth/login`, `/api/auth/google/callback`, `/api/auth/logout`
- **Users:** `/api/users`, `/api/users/:id`, `/api/users/me/profile`, `/api/users/:id/promote`, `/api/users/:id/delete`
- **Houses:** `/api/house-listing`, `/api/house-listing/:id`, `/api/house-listing/me/profile`, `/api/house-listing/:id/promote`, `/api/house-listing/:id/delete`
- **Disputes:** `/api/disputes`, `/api/disputes/:id`, `/api/disputes/me/profile`, `/api/disputes/:id/promote`, `/api/disputes/:id/delete`
- **Notifications:** `/api/notifications`, `/api/notifications/:id`, `/api/notifications/me/profile`, `/api/notifications/:id/promote`, `/api/notifications/:id/delete`
- **Payments:** `/api/payments/create-checkout-session`, `/api/payments/:id`, `/api/payments/me/profile`, `/api/payments/:id/promote`, `/api/payments/:id/delete`
