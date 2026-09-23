# 🖥 CastFeed — Frontend Design Context

> This document is the **complete design brief** for building a frontend for the CastFeed backend API.
> Paste this file directly into Claude, v0, Cursor, or any AI design tool to scaffold the full UI.

---

## 🎯 Project Overview

**CastFeed** is a YouTube-like video sharing platform. The frontend should feel like a modern, dark-mode-first streaming platform (think YouTube meets Twitch with a premium SaaS feel).

- **Backend Base URL:** `http://localhost:8000/api/v1`
- **Auth:** JWT — tokens stored in HTTP-only cookies (auto-sent by browser). Also available as Bearer tokens in the `Authorization` header for non-cookie clients.
- **Media:** All images and videos are hosted on **Cloudinary** — the API returns full CDN URLs directly.
- **Framework Recommendation:** React (Next.js App Router or Vite + React Router v6)
- **Styling Recommendation:** Tailwind CSS + shadcn/ui components OR vanilla CSS with CSS variables

---

## 🎨 Design Direction

| Property | Value |
|---|---|
| **Theme** | Dark mode primary, optional light mode toggle |
| **Primary Color** | Deep violet / electric blue (`#7C3AED` or `#3B82F6`) |
| **Background** | Near-black `#0F0F0F` with subtle card elevations |
| **Typography** | Inter or Outfit (Google Fonts) |
| **Border Radius** | 12–16px on cards, 8px on inputs |
| **Motion** | Subtle fade-in, skeleton loaders, smooth hover transitions |

---

## 🔐 Authentication Flow

### How Auth Works
1. User logs in via `POST /api/v1/users/login`
2. Backend sets two HTTP-only cookies: `accessToken` + `refreshToken`
3. All subsequent requests automatically send cookies (use `credentials: 'include'` in fetch/axios)
4. Access tokens are short-lived; use `POST /api/v1/users/refresh-token` to silently refresh
5. On logout (`POST /api/v1/users/logout`), cookies are cleared server-side

### Global Auth State
Store the logged-in user object globally (Context API / Zustand / Redux):

```ts
interface AuthUser {
  _id: string
  userName: string
  email: string
  fullName: string
  avatar: string        // Cloudinary URL
  coverImage: string    // Cloudinary URL
  watchHistory: string[] // array of video IDs
}
```

### Protected Routes
Pages that require login: Video Watch, Upload, Dashboard, Settings, Profile Edit, Liked Videos, Watch History

---

## 📄 Pages & Components

---

### 1. 🏠 Home Page (`/`)

**Purpose:** Video discovery feed — shows all published videos with filters and search.

**API Calls:**
```
GET /api/v1/video?page=1&limit=12&sortBy=createdAt&sortType=desc
GET /api/v1/video?query=<search>&sortBy=views&sortType=desc
```

**Response Shape:**
```json
{
  "videos": [
    {
      "_id": "string",
      "videoFile": "cloudinary-url",
      "thumbnail": "cloudinary-url",
      "title": "string",
      "description": "string",
      "duration": 120.5,
      "views": 4200,
      "isPublished": true,
      "createdAt": "ISO date",
      "owner": {
        "_id": "string",
        "userName": "string",
        "fullName": "string",
        "avatar": "cloudinary-url"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "perPage": 12,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Components to Build:**

| Component | Description |
|---|---|
| `<Navbar>` | Sticky top bar with logo, search input, upload button, user avatar menu |
| `<Sidebar>` | Left sidebar with navigation links (Home, Trending, Liked, History) |
| `<SearchBar>` | Controlled input with debounce (300ms), triggers video refetch |
| `<SortFilterBar>` | Pill buttons for sort options: Latest, Most Viewed, Oldest |
| `<VideoGrid>` | Responsive CSS grid (1→2→3→4 cols) of `<VideoCard>` |
| `<VideoCard>` | Thumbnail, title (truncated 2 lines), views, duration badge, channel avatar+name, relative time |
| `<VideoCardSkeleton>` | Shimmer placeholder while loading |
| `<Pagination>` | Prev/Next buttons + page indicator, or infinite scroll |
| `<EmptyState>` | "No videos found" illustration + CTA |

---

### 2. 🎬 Video Watch Page (`/watch/:videoId`)

**Purpose:** Full video player with metadata, likes, subscribe, and comments.

**API Calls:**
```
GET  /api/v1/video/:videoId          → video details + owner + like status
GET  /api/v1/comment/:videoId        → paginated comments
POST /api/v1/likes/toggle/v/:videoId → toggle like
POST /api/v1/comment/:videoId        → add comment
```

**Video Response Shape:**
```json
{
  "_id": "string",
  "videoFile": "cloudinary-url",
  "thumbnail": "cloudinary-url",
  "title": "string",
  "description": "string",
  "duration": 300,
  "views": 15000,
  "createdAt": "ISO date",
  "likesCount": 420,
  "isLiked": false,
  "owner": {
    "_id": "string",
    "userName": "string",
    "avatar": "cloudinary-url",
    "subscribersCount": 1200,
    "isSubscribed": false
  }
}
```

**Comment Response Shape:**
```json
{
  "comments": [
    {
      "_id": "string",
      "content": "string",
      "createdAt": "ISO date",
      "owner": {
        "_id": "string",
        "userName": "string",
        "avatar": "cloudinary-url"
      }
    }
  ],
  "pagination": { "currentPage": 1, "totalPages": 5, "hasNextPage": true }
}
```

**Components to Build:**

| Component | Description |
|---|---|
| `<VideoPlayer>` | Native HTML5 `<video>` or react-player, full controls, autoplay |
| `<VideoMeta>` | Title, view count, upload date |
| `<VideoActions>` | Like button (with count + toggle state), Share button |
| `<ChannelInfo>` | Avatar, channel name, subscriber count, Subscribe/Unsubscribe button |
| `<VideoDescription>` | Collapsible "Show more/less" description block |
| `<CommentSection>` | Comment input + list of `<CommentCard>` |
| `<CommentInput>` | Avatar + textarea + submit button (auth-gated) |
| `<CommentCard>` | Avatar, username, content, relative time; Edit/Delete if own comment |
| `<CommentSkeleton>` | Shimmer placeholder |
| `<RelatedVideos>` | Sidebar of video cards (can reuse `<VideoCard>` in compact mode) |

---

### 3. 👤 Channel Profile Page (`/channel/:userName`)

**Purpose:** Public profile for any user/channel showing their info and videos.

**API Calls:**
```
GET /api/v1/users/channel-profile/:userName  → channel info + subscriber count
GET /api/v1/video?userId=<channelId>         → channel's videos
```

**Channel Profile Response:**
```json
{
  "fullName": "string",
  "avatar": "cloudinary-url",
  "coverImage": "cloudinary-url",
  "subscriberCount": 4200,
  "channelsSubscribedToCount": 35,
  "isSubscribed": false
}
```

**Components to Build:**

| Component | Description |
|---|---|
| `<ChannelBanner>` | Full-width cover image with overlay |
| `<ChannelHeader>` | Avatar, full name, username, subscriber count, subscribe button |
| `<ChannelStats>` | Small stat pills: X subscribers · Y videos · Z channels subscribed |
| `<ChannelVideoGrid>` | Grid of the channel's uploaded videos (reuse `<VideoGrid>`) |
| `<EmptyChannelState>` | "No videos yet" if channel has no uploads |

---

### 4. 📊 Creator Dashboard (`/dashboard`)

**Purpose:** Private page for the logged-in creator to see their stats and manage videos.

**API Calls:**
```
GET /api/v1/dashboard/stats   → total views, subscribers, videos, likes
GET /api/v1/dashboard/videos  → all videos by this channel
PATCH /api/v1/video/toggle/publish/:videoId → toggle publish status
DELETE /api/v1/video/:videoId → delete a video
```

**Stats Response:**
```json
{
  "totalVideos": 24,
  "totalViews": 158000,
  "totalLikes": 4200,
  "totalSubscribers": 1800
}
```

**Dashboard Video Shape:**
```json
[
  {
    "_id": "string",
    "thumbnail": "cloudinary-url",
    "title": "string",
    "views": 3200,
    "isPublished": true,
    "duration": 480,
    "createdAt": "ISO date",
    "owner": { "userName": "string" }
  }
]
```

**Components to Build:**

| Component | Description |
|---|---|
| `<DashboardLayout>` | Sidebar + main content area, protected route wrapper |
| `<StatsCard>` | Icon + label + animated number (e.g., "👁 158K Views") |
| `<StatsGrid>` | 2×2 or 4-col grid of `<StatsCard>` |
| `<VideoManagementTable>` | Table with: thumbnail, title, views, status badge, actions |
| `<PublishToggle>` | Switch/pill toggle that calls the publish API on change |
| `<DeleteVideoModal>` | Confirmation modal before deleting a video |
| `<UploadVideoButton>` | CTA button → opens `<UploadVideoModal>` |

---

### 5. 📤 Upload Video Modal / Page (`/upload`)

**Purpose:** Upload a new video with title, description, thumbnail.

**API Call:**
```
POST /api/v1/video
Content-Type: multipart/form-data

Fields: title, description, video (file), thumbnail (file)
```

**Components to Build:**

| Component | Description |
|---|---|
| `<UploadVideoForm>` | Multi-step or single-form with drag-and-drop |
| `<FileDropzone>` | Drag-and-drop area for video file (shows video preview on select) |
| `<ThumbnailUploader>` | Image picker with preview |
| `<UploadProgressBar>` | Shows upload % while POSTing (use axios `onUploadProgress`) |
| `<UploadSuccess>` | Confirmation state with link to the video |

---

### 6. 🔐 Auth Pages

#### Login Page (`/login`)

**API Call:**
```
POST /api/v1/users/login
Body: { email?, userName?, password }
```

**Components:**
- `<AuthLayout>` — centered card with brand logo
- `<LoginForm>` — email/username + password fields, submit button, error display
- Link to Register

#### Register Page (`/register`)

**API Call:**
```
POST /api/v1/users/register
Content-Type: multipart/form-data

Fields: userName, email, fullName, password, avatar (file), coverImage (file, optional)
```

**Components:**
- `<RegisterForm>` — all fields + avatar upload with preview + optional cover image
- `<AvatarPicker>` — clickable circle that opens file input, shows preview

---

### 7. ⚙️ Settings / Profile Page (`/settings`)

**Purpose:** Logged-in user edits their profile info, avatar, cover image, or password.

**API Calls:**
```
GET   /api/v1/users/current-user          → load current values
PATCH /api/v1/users/update-account        → update userName / email
PATCH /api/v1/users/update-avatar         → multipart/form-data, field: avatar
PATCH /api/v1/users/update-cover-img      → multipart/form-data, field: coverImage
POST  /api/v1/users/change-password       → { oldPassword, newPassword }
```

**Components:**

| Component | Description |
|---|---|
| `<SettingsLayout>` | Tabbed or section-based layout |
| `<ProfileForm>` | Editable userName + email fields with save button |
| `<AvatarEditor>` | Current avatar shown, click to replace (uploads immediately) |
| `<CoverImageEditor>` | Wide banner image editor |
| `<ChangePasswordForm>` | Old password + new password + confirm new password |

---

### 8. 📜 Watch History Page (`/history`)

**Purpose:** Show all videos the logged-in user has previously watched.

**API Call:**
```
GET /api/v1/users/watch-history
```

**Response:** Array of video objects, each with:
```json
{
  "_id": "string",
  "videoFile": "cloudinary-url",
  "thumbnail": "cloudinary-url",
  "title": "string",
  "duration": 240,
  "views": 8000,
  "owner": {
    "userName": "string",
    "fullName": "string",
    "avatar": "cloudinary-url"
  }
}
```

**Components:**
- `<HistoryList>` — vertical list of compact `<VideoCard>` (list-view variant)
- `<EmptyHistory>` — "You haven't watched anything yet" with browse CTA

---

### 9. ❤️ Liked Videos Page (`/liked`)

**Purpose:** Show all videos the logged-in user has liked.

**API Call:**
```
GET /api/v1/likes/videos
```

**Response:** Array of `{ video: { ...videoFields } }` objects

**Components:**
- Reuse `<VideoGrid>` with liked videos
- `<EmptyLiked>` — "No liked videos yet"

---

## 🧩 Shared / Global Components

| Component | Description |
|---|---|
| `<Navbar>` | Logo, search, notifications icon, user avatar dropdown (profile, dashboard, settings, logout) |
| `<Sidebar>` | Collapsible left nav: Home, Trending, Subscriptions, History, Liked, Dashboard (if logged in) |
| `<Avatar>` | Circular image with fallback initials |
| `<Badge>` | Small pill: view counts, durations, published/unpublished status |
| `<Button>` | Primary, secondary, ghost, destructive variants |
| `<Modal>` | Generic overlay modal with backdrop blur |
| `<Toast>` | Slide-in success/error notifications (use react-hot-toast or sonner) |
| `<Skeleton>` | Shimmer placeholder blocks for loading states |
| `<ProtectedRoute>` | Wrapper that redirects to `/login` if not authenticated |
| `<ErrorBoundary>` | Catches API errors and shows friendly message |
| `<InfiniteScroll>` | Optional: replace pagination with scroll-triggered loading |

---

## 🔄 API Client Setup

Configure a base API client with credentials support:

```ts
// lib/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true, // IMPORTANT: sends cookies automatically
})

// Auto-refresh interceptor
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await axios.post('/api/v1/users/refresh-token', {}, { withCredentials: true })
        return api.request(error.config)
      } catch {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

---

## 📡 All API Endpoints Summary

| Page / Feature | Method | Endpoint |
|---|---|---|
| Register | POST | `/users/register` |
| Login | POST | `/users/login` |
| Logout | POST | `/users/logout` |
| Refresh token | POST | `/users/refresh-token` |
| Current user | GET | `/users/current-user` |
| Update account | PATCH | `/users/update-account` |
| Update avatar | PATCH | `/users/update-avatar` |
| Update cover | PATCH | `/users/update-cover-img` |
| Change password | POST | `/users/change-password` |
| Channel profile | GET | `/users/channel-profile/:userName` |
| Watch history | GET | `/users/watch-history` |
| All videos | GET | `/video` |
| Upload video | POST | `/video` |
| Get video | GET | `/video/:videoId` |
| Update video | PATCH | `/video/:videoId` |
| Delete video | DELETE | `/video/:videoId` |
| Toggle publish | PATCH | `/video/toggle/publish/:videoId` |
| Get comments | GET | `/comment/:videoId` |
| Add comment | POST | `/comment/:videoId` |
| Update comment | PATCH | `/comment/c/:commentId` |
| Delete comment | DELETE | `/comment/c/:commentId` |
| Like video | POST | `/likes/toggle/v/:videoId` |
| Like comment | POST | `/likes/toggle/c/:commentId` |
| Liked videos | GET | `/likes/videos` |
| Dashboard stats | GET | `/dashboard/stats` |
| Dashboard videos | GET | `/dashboard/videos` |
| Create playlist | POST | `/playlist` |
| User playlists | GET | `/playlist/user/:userId` |

---

## 🗂 Suggested Folder Structure (React + Vite)

```
src/
├── api/
│   ├── client.ts          # Axios instance with interceptors
│   ├── auth.ts            # Auth API functions
│   ├── video.ts           # Video API functions
│   ├── comment.ts         # Comment API functions
│   ├── like.ts            # Like API functions
│   └── dashboard.ts       # Dashboard API functions
├── components/
│   ├── ui/                # Reusable base components (Button, Modal, Badge, etc.)
│   ├── video/             # VideoCard, VideoGrid, VideoPlayer, VideoActions
│   ├── comment/           # CommentSection, CommentCard, CommentInput
│   ├── channel/           # ChannelBanner, ChannelHeader, ChannelStats
│   ├── dashboard/         # StatsCard, VideoManagementTable, PublishToggle
│   └── layout/            # Navbar, Sidebar, ProtectedRoute
├── pages/
│   ├── HomePage.tsx
│   ├── WatchPage.tsx
│   ├── ChannelPage.tsx
│   ├── DashboardPage.tsx
│   ├── UploadPage.tsx
│   ├── SettingsPage.tsx
│   ├── HistoryPage.tsx
│   ├── LikedPage.tsx
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── store/
│   └── authStore.ts       # Zustand / Context for auth state
├── hooks/
│   ├── useAuth.ts
│   ├── useVideos.ts
│   └── useComments.ts
└── utils/
    ├── formatDuration.ts  # e.g. 300 → "5:00"
    ├── formatViews.ts     # e.g. 15000 → "15K"
    └── formatDate.ts      # e.g. "2 days ago"
```

---

## 🔔 UI States to Handle

For every data-fetching component, implement these states:

| State | UI |
|---|---|
| **Loading** | Skeleton shimmer placeholders |
| **Error** | Error card with retry button |
| **Empty** | Illustration + descriptive message + CTA |
| **Success** | Actual content |
| **Auth Required** | Prompt to login with redirect |

---

## 🧪 Key UX Notes

1. **Video cards:** Show duration as a badge in the bottom-right corner of the thumbnail (e.g., `4:32`)
2. **Views:** Format large numbers — `1200 → 1.2K`, `1500000 → 1.5M`
3. **Relative time:** "2 hours ago", "3 days ago" (use `date-fns` or `dayjs`)
4. **Like button:** Optimistic update — toggle immediately in UI, revert on API error
5. **Subscribe button:** Disable during API call to prevent double-click
6. **Comments:** Show avatar initial if avatar URL fails to load
7. **Upload form:** Validate file type (video/\*) and size client-side before uploading
8. **Dashboard toggle:** `isPublished` badge should be green (Published) or gray (Draft)
9. **Auth redirect:** After login, redirect to the page the user was trying to visit

---

*This document was generated from the live CastFeed backend codebase.*
*Backend repo: https://github.com/akasahilsingh/castfeed*
