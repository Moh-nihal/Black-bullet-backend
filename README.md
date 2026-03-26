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

- Seed CMS content defaults:

```bash
npm run seed:content
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

- `POST /api/admin/login`
  - Login for admin users
  - JSON body: `{ "email": "...", "password": "..." }`
  - Returns: `{ success, message }` and sets `admin_token` cookie

- `GET /api/admin/me`
  - Returns currently authenticated admin
  - Requires `Authorization: Bearer <token>` or `admin_token` cookie
  - Returns: `{ ok, admin }`

- `POST /api/admin/logout`
  - Clears admin session cookie
  - Requires authentication
  - Returns: `{ ok, message }`

- `GET /api/admin/services`
  - List services with optional pagination/filter query params
  - Roles: `editor`, `admin`, `super_admin`
  - Query params: `page`, `limit`, `status`, `category`, `search`
  - Returns: `{ ok, data, pagination }`

- `POST /api/admin/services`
  - Create a new service
  - Roles: `admin`, `super_admin`
  - Body: `title` (required), optional `slug`, `description`, `price`, `images`, `features`, `category`, `status`, `metaTitle`, `metaDescription`, `metaKeywords`
  - Returns: `{ ok, data }`

- `GET /api/admin/services/:id`
  - Fetch one service by Mongo id
  - Roles: `editor`, `admin`, `super_admin`
  - Returns: `{ ok, data }`

- `PUT /api/admin/services/:id`
  - Partially update a service
  - Roles: `admin`, `super_admin`
  - Supports optional image cleanup payload: `removedImagePublicIds`, `previousImages`
  - Returns: `{ ok, data }`

- `DELETE /api/admin/services/:id`
  - Delete a service
  - Roles: `admin`, `super_admin`
  - Optional body: `imagePublicIds` for explicit Cloudinary cleanup
  - Returns: `{ ok, message }`

- `GET /api/admin/blog`
  - List blog posts with optional pagination/filter query params
  - Roles: `editor`, `admin`, `super_admin`
  - Query params: `page`, `limit`, `status`, `category`, `search`
  - Returns: `{ ok, data, pagination }`

- `POST /api/admin/blog`
  - Create a new blog post (slug auto-generated from title when missing)
  - Roles: `admin`, `super_admin`
  - Body: `title`, `content` (required), optional `slug`, `category`, `shortDesc`, `author`, `tags`, `image`, `ogImage`, `metaTitle`, `metaDescription`, `status`, `publishedAt`, `views`
  - `image` / `ogImage` should be Cloudinary URLs (e.g. returned from `/api/media/upload`)
  - Returns: `{ ok, data }`

- `GET /api/admin/blog/:id`
  - Fetch one blog post by Mongo id
  - Roles: `editor`, `admin`, `super_admin`
  - Returns: `{ ok, data }`

- `PUT /api/admin/blog/:id`
  - Partially update a blog post
  - Roles: `admin`, `super_admin`
  - Body: any subset of the create fields
  - If `title` changes and `slug` is missing/empty, slug is auto-regenerated from `title`
  - Cloudinary cleanup: when `image` or `ogImage` is replaced/removed, the old asset is deleted using the previous stored URL
  - Returns: `{ ok, data }`

- `DELETE /api/admin/blog/:id`
  - Delete a blog post
  - Roles: `admin`, `super_admin`
  - Cloudinary cleanup: deletes featured `image` and `ogImage` when present
  - Returns: `{ ok, message }`

- `GET /api/admin/gallery`
  - List gallery items with optional pagination/filter query params
  - Roles: `editor`, `admin`, `super_admin`
  - Query params: `page`, `limit`, `status`, `category`, `type` (`image|video`), `search`
  - Returns: `{ ok, data, pagination }`

- `POST /api/admin/gallery`
  - Create a gallery item with image/video upload
  - Roles: `admin`, `super_admin`
  - Content type: `multipart/form-data`
  - File field: `file`
  - Body fields: `title` (required), `category`, `description`, `altText`, `status` (`active|inactive|draft`), `sortOrder`
  - Upload is handled by existing Cloudinary media upload logic; server derives `type` from mimetype
  - Returns: `{ ok, data }`

- `DELETE /api/admin/gallery/:id`
  - Delete a gallery item and remove its Cloudinary asset (if `publicId` exists)
  - Roles: `admin`, `super_admin`
  - Returns: `{ ok, message }`

- `GET /api/admin/content/:pageKey`
  - Fetch a CMS content document by `pageKey`
  - Roles: `editor`, `admin`, `super_admin`
  - Allowed `pageKey`: `home`, `services`, `gallery`, `blog`, `settings`
  - Returns: `{ ok, data }`

- `PUT /api/admin/content/:pageKey`
  - Upsert a CMS content document by `pageKey`
  - Roles: `editor`, `admin`, `super_admin`
  - Allowed `pageKey`: `home`, `services`, `gallery`, `blog`, `settings`
  - Body: JSON object content for the page
  - Notes: image fields are stored as URL/string values; upload remains on `/api/media/upload`
  - Returns: `{ ok, data }`

- `POST /api/bookings`
  - Create a new public booking (from the booking form)
  - Returns: `{ ok, data }`

- `GET /api/admin/bookings`
  - List bookings with optional filters and pagination
  - Roles: `editor`, `admin`, `super_admin`
  - Query params:
    - `status`: `PENDING|CONFIRMED|IN-PROGRESS|COMPLETED|CANCELLED|CRITICAL` (case-insensitive; legacy lowercase values are also accepted)
    - `dateStart`, `dateEnd`: date range filters for `preferredDate` (`dateEnd` is end-exclusive)
    - `page`, `limit`: pagination
  - Returns: `{ ok, data, pagination }`

- `GET /api/admin/bookings/:id`
  - Fetch one booking by Mongo id
  - Roles: `editor`, `admin`, `super_admin`
  - Returns: `{ ok, data }`

- `PUT /api/admin/bookings/:id`
  - Update booking admin fields
  - Roles: `admin`, `super_admin`
  - Body: `status` and/or `notes` only
  - Returns: `{ ok, data }`

- `DELETE /api/admin/bookings/:id`
  - Delete a booking
  - Roles: `admin`, `super_admin`
  - Returns: `{ ok, message }`

## Data Models

The server registers these Mongoose models at startup:

- `Admin`
- `Booking`
- `Service`
- `Settings`
- `Blog`
- `ContentPage`

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
    adminBookingsController.js
    adminServicesController.js
    adminBlogController.js
    adminGalleryController.js
    adminContentController.js
    mediaController.js
  middleware/
    authMiddleware.js
    errorHandler.js # Not found and error middleware
  models/           # Mongoose schemas
  services/
    mediaService.js # Cloudinary upload/delete service
  routes/
    auth.js         # Admin auth endpoints
    adminBookings.js # Admin bookings CRUD endpoints
    adminServices.js # Admin services CRUD endpoints
    adminBlog.js     # Admin blog CRUD endpoints
    adminGallery.js # Admin gallery CRUD endpoints
    adminContent.js # Admin CMS content endpoints
    health.js       # Health-check endpoint
    media.js        # Media upload/delete endpoints
  scripts/
    seedContentPages.js # Idempotent CMS content seed
  utils/
    jwt.js          # JWT sign and verify helpers
```

## Notes

- CORS credentials are enabled only when explicit `CORS_ORIGIN` values are set.
- API resource routes (auth, bookings, services, posts, etc.) can be added under `routes/` and mounted in `app.js`.
