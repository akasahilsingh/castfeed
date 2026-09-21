# 🎬 CastFeed

> A full-featured video sharing & social platform backend — built with Node.js, Express, MongoDB, and Cloudinary.

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_Storage-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Project Structure](#-project-structure)
- [Data Models](#-data-models)
- [API Reference](#-api-reference)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)

---

## 🚀 About the Project

**CastFeed** is a production-ready REST API backend for a YouTube-like video platform. Users can register, upload videos, like content, comment, subscribe to channels, manage playlists, and view a personalized creator dashboard — all backed by a secure JWT authentication system and Cloudinary-powered media storage.

### ✅ What's Built

| Feature | Status |
|---|---|
| User Registration & Login | ✅ Complete |
| JWT Auth (Access + Refresh Tokens) | ✅ Complete |
| Avatar & Cover Image Upload | ✅ Complete |
| Video Upload & Management | ✅ Complete |
| View Count & Watch History | ✅ Complete |
| Like / Unlike (Video, Comment, Tweet) | ✅ Complete |
| Comments (CRUD) | ✅ Complete |
| Channel Subscriptions | ✅ Complete |
| Channel Profile & Stats | ✅ Complete |
| Creator Dashboard | ✅ Complete |
| Health Check Endpoint | ✅ Complete |
| Playlist Management | 🚧 In Progress |

---

## 🛠 Tech Stack

### Core Runtime & Framework

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | `22.x` | JavaScript runtime |
| **Express.js** | `^5.2.1` | HTTP server & routing framework |

### Database

| Tool | Version | Purpose |
|---|---|---|
| **MongoDB** | Cloud Atlas | NoSQL document database |
| **Mongoose** | `^9.9.3` | ODM (Object-Document Mapper) for MongoDB |

### Authentication & Security

| Tool | Version | Purpose |
|---|---|---|
| **jsonwebtoken (JWT)** | `^9.0.3` | Access & Refresh token generation/verification |
| **bcrypt** | `^6.0.0` | Password hashing (salt rounds: 10) |
| **cookie-parser** | `^1.4.7` | Parsing HTTP-only cookies for token storage |

### File Upload & Media

| Tool | Version | Purpose |
|---|---|---|
| **Multer** | `^2.2.0` | Multipart form-data handling (local temp storage) |
| **Cloudinary SDK** | `^2.10.1` | Cloud media storage for images & videos |

### Utilities & Dev

| Tool | Version | Purpose |
|---|---|---|
| **dotenv** | `^17.4.2` | Environment variable management |
| **cors** | `^2.8.6` | Cross-Origin Resource Sharing configuration |
| **nodemon** | `^3.1.14` | Auto-restart server during development |

> **Module System:** ES Modules (`"type": "module"`) — uses `import/export` syntax throughout the entire codebase.

---

## 🏗 Architecture Overview

CastFeed follows a **layered MVC (Model-View-Controller)** architecture pattern:

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT / API CONSUMER               │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP Request
┌──────────────────────────▼──────────────────────────────┐
│                    Express App (app.js)                  │
│         Middleware: CORS │ Cookie-Parser │ JSON Body     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                        ROUTES LAYER                      │
│   /api/v1/users  │  /api/v1/video  │  /api/v1/comment  │
│   /api/v1/likes  │  /api/v1/playlist  │  /api/v1/dashboard │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    MIDDLEWARE LAYER                       │
│         verifyJWT (auth)  │  Multer (file upload)        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    CONTROLLERS LAYER                      │
│  user │ video │ comment │ like │ dashboard │ playlist    │
└────────────────┬─────────────────────┬───────────────────┘
                 │                     │
    ┌────────────▼────┐     ┌──────────▼────────────┐
    │  MONGOOSE MODELS │     │  UTILITY SERVICES     │
    │  User │ Video   │     │  cloudinary.js        │
    │  Comment │ Like │     │  asyncHandler.js      │
    │  Subscription   │     │  ApiError.js          │
    │  Tweet │ Playlist│    │  ApiResponse.js       │
    └────────────┬────┘     └───────────────────────┘
                 │
    ┌────────────▼────────────────┐
    │   MongoDB (Atlas Cloud DB)  │
    └─────────────────────────────┘
```

### Key Design Decisions

| Decision | Implementation |
|---|---|
| **Async Error Handling** | All controllers wrapped in `asyncHandler` — a custom try/catch wrapper that forwards errors to the global Express error handler |
| **Standardized Responses** | `ApiResponse` class used across all controllers for consistent `{ statusCode, data, message, success }` shape |
| **Structured Errors** | `ApiError` extends native `Error` with `statusCode` and `errors[]` for validation feedback |
| **Temporary File Storage** | Multer saves uploads to `public/temp/` locally, then streamed to Cloudinary and cleaned up immediately with `fs.unlinkSync` |
| **Token Strategy** | Short-lived Access Token (cookie + Bearer header) + long-lived Refresh Token (HTTP-only cookie + DB-stored) |
| **MongoDB Aggregation** | Complex data joins use Mongoose Aggregation Pipelines with `$facet`, `$lookup`, `$addFields` for efficient single-query results |

---

## 📁 Project Structure

```
castfeed/
├── index.js                    # Entry point — DB connect + server start
├── app.js                      # Express app setup, middleware, route mounting
├── package.json
├── .env                        # Environment variables (not committed)
├── .gitignore
├── public/
│   └── temp/                   # Temporary local storage for uploaded files
└── src/
    ├── constant.js             # App-wide constants (token expiry times)
    ├── db/
    │   └── db.js               # MongoDB connection via Mongoose
    ├── model/
    │   ├── user.model.js       # User schema (bcrypt + JWT methods)
    │   ├── video.model.js      # Video schema (indexed for performance)
    │   ├── comment.model.js    # Comment schema
    │   ├── like.model.js       # Like schema (video / comment / tweet)
    │   ├── subscription.model.js # Subscriber-Channel relationship
    │   ├── tweet.model.js      # Tweet/post schema
    │   └── playlist.model.js   # Playlist schema
    ├── controllers/
    │   ├── user.controller.js     # Auth, profile, avatar, watch history
    │   ├── video.controller.js    # CRUD, publish toggle, pagination
    │   ├── comment.controller.js  # Comment CRUD with pagination
    │   ├── like.controller.js     # Toggle likes on video/comment/tweet
    │   ├── dashboard.controller.js# Channel stats and videos
    │   ├── playlist.controller.js # Playlist CRUD (in progress)
    │   └── healthcheck.controller.js
    ├── routes/
    │   ├── user.routes.js
    │   ├── video.routes.js
    │   ├── comment.routes.js
    │   ├── like.route.js
    │   ├── dashboard.route.js
    │   ├── playlist.route.js
    │   └── healthcheck.route.js
    ├── middleware/
    │   ├── auth.middleware.js    # JWT verification middleware
    │   └── multer.middleware.js  # Multer disk storage config
    └── utils/
        ├── asyncHandler.js       # Async try/catch wrapper
        ├── apiError.js           # Custom error class
        ├── apiResponse.js        # Standardized response class
        └── cloudinary.js         # Cloudinary upload/delete helpers
```

---

## 🗄 Data Models

### User

| Field | Type | Notes |
|---|---|---|
| `userName` | String | unique, indexed, lowercase |
| `email` | String | unique, lowercase |
| `fullName` | String | required |
| `avatar` | String | Cloudinary URL, required |
| `coverImage` | String | Cloudinary URL, optional |
| `password` | String | bcrypt hashed (pre-save hook) |
| `refreshToken` | String | stored for token rotation |
| `watchHistory` | ObjectId[] | refs to Video |

**Methods:** `isPasswordCorrect()`, `generateAccessToken()`, `generateRefreshToken()`

### Video

| Field | Type | Notes |
|---|---|---|
| `videoFile` | String | Cloudinary URL |
| `thumbnail` | String | Cloudinary URL |
| `title` | String | required |
| `description` | String | required |
| `duration` | Number | auto-extracted from Cloudinary response |
| `views` | Number | default 0, incremented on fetch |
| `isPublished` | Boolean | toggle-able by owner |
| `owner` | ObjectId | ref to User, indexed |

### Like

| Field | Type | Notes |
|---|---|---|
| `video` | ObjectId | optional ref to Video |
| `comment` | ObjectId | optional ref to Comment |
| `tweet` | ObjectId | optional ref to Tweet |
| `likedBy` | ObjectId | ref to User |

### Subscription

| Field | Type | Notes |
|---|---|---|
| `subscriber` | ObjectId | the user who is subscribing |
| `channel` | ObjectId | the user/channel being subscribed to |

---

## 📡 API Reference

> **Base URL:** `http://localhost:8000/api/v1`

### 👤 Users — `/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | ❌ | Register with avatar (multipart/form-data) |
| `POST` | `/login` | ❌ | Login, returns access + refresh tokens |
| `POST` | `/logout` | ✅ | Clear tokens and logout |
| `POST` | `/refresh-token` | ❌ | Rotate access token using refresh token |
| `POST` | `/change-password` | ✅ | Change current password |
| `GET` | `/current-user` | ✅ | Get authenticated user's profile |
| `PATCH` | `/update-account` | ✅ | Update userName / email |
| `PATCH` | `/update-avatar` | ✅ | Upload new avatar image |
| `PATCH` | `/update-cover-img` | ✅ | Upload new cover image |
| `GET` | `/channel-profile/:userName` | ✅ | Get public channel profile with subscriber count |
| `GET` | `/watch-history` | ✅ | Get user's video watch history |

### 🎥 Videos — `/video`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ❌ | List all videos (paginated, filterable, sortable) |
| `POST` | `/` | ✅ | Upload and publish a new video |
| `GET` | `/:videoId` | ✅ | Get video details (auto-increments views & updates watch history) |
| `PATCH` | `/:videoId` | ✅ | Update video title, description, or thumbnail |
| `DELETE` | `/:videoId` | ✅ | Delete video and remove assets from Cloudinary |
| `PATCH` | `/toggle/publish/:videoId` | ✅ | Toggle video publish/unpublish status |

**Query params for `GET /`:** `page`, `limit`, `query`, `sortBy` (createdAt/views/duration/title), `sortType` (asc/desc), `userId`

### 💬 Comments — `/comment`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/:videoId` | ❌ | Get paginated comments for a video |
| `POST` | `/:videoId` | ✅ | Add a comment to a video |
| `PATCH` | `/c/:commentId` | ✅ | Update your comment |
| `DELETE` | `/c/:commentId` | ✅ | Delete your comment |

### ❤️ Likes — `/likes`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/toggle/v/:videoId` | ✅ | Toggle like on a video |
| `POST` | `/toggle/c/:commentId` | ✅ | Toggle like on a comment |
| `POST` | `/toggle/t/:tweetId` | ✅ | Toggle like on a tweet |
| `GET` | `/videos` | ✅ | Get all videos liked by the current user |

### 📊 Dashboard — `/dashboard`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/stats` | ✅ | Get channel stats (total views, videos, likes, subscribers) |
| `GET` | `/videos` | ✅ | Get all videos uploaded by the authenticated channel |

### 📋 Playlist — `/playlist`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | ✅ | Create a playlist (🚧 in progress) |
| `GET` | `/user/:userId` | ✅ | Get user playlists (🚧 in progress) |
| `GET` | `/:playlistId` | ✅ | Get playlist by ID (🚧 in progress) |
| `PATCH` | `/:playlistId` | ✅ | Update playlist details (🚧 in progress) |
| `DELETE` | `/:playlistId` | ✅ | Delete a playlist (🚧 in progress) |
| `PATCH` | `/add/:videoId/:playlistId` | ✅ | Add video to playlist (🚧 in progress) |
| `PATCH` | `/remove/:videoId/:playlistId` | ✅ | Remove video from playlist (🚧 in progress) |

### 🩺 Health Check — `/healthcheck`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ❌ | Server health check |

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
PORT=8000

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net

# JWT
JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

# Cloudinary
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_SECRET_KEY=your_api_secret
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## ⚡ Getting Started

### Prerequisites

- Node.js `v18+`
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/akasahilsingh/castfeed.git
cd castfeed

# Install dependencies
npm install

# Create environment file and fill in your values
cp .env.example .env

# Start the development server
npm start
```

The server will start on `http://localhost:8000`.

---

## 👨‍💻 Author

**Sahil Singh**

---

## 📄 License

This project is licensed under the **ISC License**.
