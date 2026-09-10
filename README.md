# 🎬 CastFeed

> **Where creator broadcasts meet social feeds.**

> ⚠️ **This project is currently under active development. Features and APIs are subject to change.**

A **video sharing platform backend** where users can upload, watch, and engage with video content. Built with Node.js, Express, and MongoDB.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [Authentication](#authentication)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Overview

CastFeed is a RESTful backend API for a video-sharing and creator community platform — combining YouTube-style video broadcasting with social feed engagement. The project currently covers the foundational architecture including:

- User authentication with **JWT (Access + Refresh Tokens)**
- **Bcrypt** password hashing
- MongoDB data models for **Users** and **Videos**
- Secure token-based session management
- Watch history tracking per user

> The project is in early stages — controllers, routes, and API endpoints are still being built out.

---

## Tech Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Runtime      | Node.js (ESM modules)   |
| Framework    | Express.js v5           |
| Database     | MongoDB + Mongoose      |
| Auth         | JSON Web Tokens (JWT)   |
| Encryption   | Bcrypt                  |
| Config       | dotenv                  |
| Dev Server   | Nodemon                 |
| Cookies      | cookie-parser           |
| CORS         | cors                    |

---

## Project Structure

```
castfeed/
├── app.js                  # Express app initialization
├── index.js                # Server entry point (DB connect + listen)
├── package.json
├── .env                    # Environment variables (not committed)
├── .gitignore
├── public/
│   └── temp/               # Temporary file uploads
└── src/
    ├── constant.js          # App-wide constants (token expiry, etc.)
    ├── db/
    │   └── db.js            # MongoDB connection logic
    ├── model/
    │   ├── user.model.js    # User schema & auth methods
    │   └── video.model.js   # Video schema
    ├── controllers/         # 🚧 Under development
    └── routes/              # 🚧 Under development
```

---

## Data Models

### 👤 User

| Field          | Type       | Notes                                |
|----------------|------------|--------------------------------------|
| `userName`     | String     | Unique, lowercase, indexed           |
| `email`        | String     | Unique, lowercase                    |
| `fullName`     | String     | Required                             |
| `avatar`       | String     | URL from cloud storage service       |
| `coverImage`   | String     | URL from cloud storage service       |
| `password`     | String     | Bcrypt hashed (10 salt rounds)       |
| `refreshToken` | String     | Stored for session management        |
| `watchHistory` | ObjectId[] | References to `Video` documents      |
| `createdAt`    | Date       | Auto-generated (Mongoose timestamps) |
| `updatedAt`    | Date       | Auto-generated (Mongoose timestamps) |

**User instance methods:**
- `isPasswordCorrect(password)` — compares plain-text password with the stored hash
- `generateAccessToken()` — returns a signed JWT (expires in **15 minutes**)
- `generateRefreshToken()` — returns a signed JWT (expires in **7 days**)

---

### 🎥 Video

| Field         | Type      | Notes                                |
|---------------|-----------|--------------------------------------|
| `videoFile`   | String    | URL to the hosted video file         |
| `thumbnail`   | String    | URL to the video thumbnail image     |
| `title`       | String    | Required                             |
| `description` | String    | Required                             |
| `duration`    | Number    | Video duration in seconds            |
| `views`       | Number    | View count                           |
| `isPublished` | Boolean   | Defaults to `false`                  |
| `owner`       | ObjectId  | Reference to the `User` who uploaded |
| `createdAt`   | Date      | Auto-generated                       |
| `updatedAt`   | Date      | Auto-generated                       |

---

## Authentication

CastFeed uses a **dual-token authentication** strategy:

- **Access Token** — Short-lived (15 minutes), used to authorize API requests
- **Refresh Token** — Long-lived (7 days), stored in the database and used to issue new access tokens without re-login

Passwords are never stored in plain text — they are hashed using **bcrypt** with a salt round of 10 before saving to the database.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) instance (local or Atlas)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/castfeed.git
cd castfeed

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Then fill in your values (see Environment Variables below)

# 4. Start the development server
npm start
```

The server will start on `http://localhost:8000` by default.

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Server
PORT=8000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/castfeed

# JWT Secrets
JWT_ACCESS_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## Available Scripts

| Command       | Description                              |
|---------------|------------------------------------------|
| `npm start`   | Start development server with Nodemon    |
| `npm test`    | *(No tests configured yet)*              |

---

## Roadmap

> 🚧 The following features are planned or actively being developed:

- [ ] **User Routes & Controllers** — Register, Login, Logout, Refresh Token
- [ ] **Video Routes & Controllers** — Upload, Fetch, Update, Delete
- [ ] **Cloud Storage Integration** — Cloudinary or AWS S3 for video/image hosting
- [ ] **Watch History** — Track and retrieve per-user watch history
- [ ] **Middleware** — Auth guard, error handler, async wrapper
- [ ] **Likes & Comments** — Engagement features
- [ ] **Subscriptions** — Subscribe to channels / other users
- [ ] **Playlists** — Create and manage video playlists
- [ ] **Search & Pagination** — MongoDB Aggregation Pipeline for querying
- [ ] **Input Validation** — Request body validation (e.g., Zod or Joi)
- [ ] **API Tests** — Automated test suite

---

## Author

**Sahil Singh**

---

> 📌 *This is a learning project and is under active development. Contributions, suggestions, and feedback are welcome!*
