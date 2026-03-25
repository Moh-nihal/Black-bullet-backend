# Black Bullet Backend

Node.js + Express backend API for Black Bullet, with MongoDB via Mongoose.

## Tech Stack

- Node.js (CommonJS)
- Express
- MongoDB + Mongoose
- dotenv
- cors
- bcrypt
- Cloudinary
- multer

## Prerequisites

- Node.js 18+ (recommended)
- MongoDB instance (local or cloud)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the backend root (or copy from `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=black_bullet
CORS_ORIGIN=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Environment Variables

- `PORT`: API port (default: `5000`)
- `MONGODB_URI`: MongoDB connection URI (**required**)
- `MONGODB_DB_NAME`: Optional database name override
- `CORS_ORIGIN`: Comma-separated list of allowed origins. If not set, `*` is used.
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name (**required** for media endpoints)
- `CLOUDINARY_API_KEY`: Cloudinary API key (**required** for media endpoints)
- `CLOUDINARY_API_SECRET`: Cloudinary API secret (**required** for media endpoints)
- `JWT_SECRET`: Secret used to sign/verify admin access tokens (**required** for auth)
- `JWT_EXPIRES_IN`: Token expiry duration (default: `7d`)

## Run

- Development (watch mode):

```bash
npm run dev
```

- Production:

```bash
npm start
```

## API Endpoints

- `GET /`
  - Basic server status
  - Returns: `{ ok, service, message }`

- `GET /api/health`
  - Health + DB connection status
  - Returns: `{ ok, uptimeSeconds, timestamp, database }`

- `POST /api/media/upload`
  - Uploads an image or video file to Cloudinary
  - Requires bearer token; roles: `editor`, `admin`, `super_admin`
  - Form-data field: `file`
  - Supports: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/webm`, `video/quicktime`
  - Returns: `{ ok, media: { resourceType, publicId, url, ... } }`

- `DELETE /api/media`
  - Deletes a Cloudinary asset
  - Requires bearer token; roles: `admin`, `super_admin`
  - JSON body: `{ "publicId": "...", "resourceType": "image|video" }`
  - Returns: `{ ok, message }`

- `POST /api/admin/auth/login`
  - Login for admin users
  - JSON body: `{ "email": "...", "password": "..." }`
  - Returns: `{ ok, token, admin }`

- `GET /api/admin/auth/me`
  - Returns currently authenticated admin
  - Requires `Authorization: Bearer <token>`
  - Returns: `{ ok, admin }`

## Data Models

The server registers these Mongoose models at startup:

- `Admin`
- `Booking`
- `Service`
- `Settings`
- `Blog`

## Project Structure

```text
Black_bullet_backend/
  app.js            # Express app and middleware
  index.js          # Server bootstrap + DB connection
  config/
    db.js           # MongoDB connection logic
    cloudinary.js   # Cloudinary config helper
  controllers/
    authController.js
    mediaController.js
  middleware/
    authMiddleware.js
    errorHandler.js # Not found and error middleware
  models/           # Mongoose schemas
  services/
    mediaService.js # Cloudinary upload/delete service
  routes/
    auth.js         # Admin auth endpoints
    health.js       # Health-check endpoint
    media.js        # Media upload/delete endpoints
  utils/
    jwt.js          # JWT sign and verify helpers
```

## Notes

- CORS credentials are enabled only when explicit `CORS_ORIGIN` values are set.
- API resource routes (auth, bookings, services, posts, etc.) can be added under `routes/` and mounted in `app.js`.
