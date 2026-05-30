# 墨韵 (InkRhyme) — Page Flow Diagram

## Route Table

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| `/` | HomePage | No | Story feed with bento grid + featured strip |
| `/login` | LoginPage | No | Email/password sign-in |
| `/register` | RegisterPage | No | New account registration |
| `/create` | CreateStoryPage | Yes | Story composer with optional AI music |
| `/story/:id` | StoryDetailPage | No | Full reading view + music player + comments |
| `/profile` | ProfilePage | Yes | User settings, stats, bio |
| `/my-space` | MySpacePage | Yes | My stories, liked stories, usage stats |
| `/payment` | PaymentPage | Yes | Subscription plan listing |
| `/checkout` | CheckoutPage | Yes | Payment method selection + order confirmation |
| `/admin` | Dashboard | Yes (admin) | Admin dashboard overview |
| `/admin/stories` | AdminStoriesPage | Yes (admin) | Story management |
| `/admin/comments` | AdminCommentsPage | Yes (admin) | Comment management |
| `/admin/users` | AdminUsersPage | Yes (admin) | User management |
| `/admin/products` | AdminProductsPage | Yes (admin) | Product management |

## Flow Diagram

```
                    ┌──────────────────────────┐
                    │          / (Home)         │
                    │    Story feed + bento     │
                    └──────────┬───────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐    ┌───────────────┐    ┌───────────────┐
   │   /login    │    │  /story/:id   │    │    /create    │
   │ (unauthent) │    │  (public)     │    │  (auth req'd) │
   └──────┬──────┘    └───────┬───────┘    └───────────────┘
          │                   │
          ▼                   │
   ┌─────────────┐            │ (music ready toast)
   │  /register  │            │ ──────────────────────►  /story/:id
   └─────────────┘            │
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌───────────────┐    ┌───────────────┐
   │  /profile   │    │   /my-space   │    │   /payment    │
   │  (auth)     │    │   (auth)      │    │   (auth)      │
   └─────────────┘    └───────────────┘    └───────┬───────┘
                                                   │
                                                   ▼
                                          ┌───────────────┐
                                          │   /checkout   │
                                          │   (auth)      │
                                          └───────────────┘

          ┌──────────────────────────────────┐
          │           /admin (admin)          │
          ├──────────┬──────────┬─────────────┤
          │ /stories │ /comments│ /users      │ /products
          └──────────┴──────────┴─────────────┘
```

## Transition Directions

| From | To | Direction |
|------|----|-----------|
| `/` | `/story/:id` | Forward (detail reveal) |
| `/story/:id` | `/` | Backward (return to feed) |
| `/` | `/create` | Forward (composer slide-up) |
| `/create` | `/` | Backward (dismiss composer) |
| `/` | `/login` | Forward |
| `/login` | `/register` | Forward (slide) |
| Any | `/payment` → `/checkout` | Forward (sequential) |
| Any | `/admin/**` | Forward (panel switch) |

All page transitions use `pageEnter` animation: fade-in + 12px slide-up, 0.4s ease-out-expo.

## Data Flow Per Page

| Page | API Calls (on mount) | Cached? |
|------|---------------------|---------|
| `/` | `GET /api/stories?language=&countryCode=` | No |
| `/story/:id` | `GET /api/stories/:id`, `GET /api/music/story/:id`, `GET /api/likes/:storyId/info`, poll `GET /api/music/status/:id` (if pending) | No |
| `/create` (submit) | `POST /api/stories`, `POST /api/music/generate` (optional) | — |
| `/login` (submit) | `POST /api/auth/login` | — |
| `/register` (submit) | `POST /api/auth/register` | — |
| `/profile` | `GET /api/users/me/profile` | No |
| `/my-space` | `GET /api/users/me/stories`, `GET /api/users/me/liked`, `GET /api/users/me/stats` | No |
| `/payment` | `GET /api/products` | No |
| `/checkout` | `POST /api/orders` → `POST /api/payment/create` | — |
| `/admin/*` | Admin CRUD endpoints | No |

## Auth Guard Flow

```
Visitor lands on /create, /profile, /my-space, /payment, /checkout, /admin
        │
        ▼
  isAuthenticated?
        │
   ┌────┴────┐
   │ NO      │ YES
   ▼         ▼
redirect    render
to /login   page
```

- **HomePage** (`/`): Public, shows all stories. Unauthenticated users see story cards but login/register nav links.
- **StoryDetailPage** (`/story/:id`): Public reading. Auth required only for commenting/liking.
- **Admin routes** (`/admin/*`): Additionally checked for `user.role === 'admin'` in AdminLayout.

## Async Music Flow

```
CreateStoryPage ──(POST /api/music/generate)──► returns 202 { musicId, status:'pending' }
        │
        ├── stores musicId in localStorage('mo_pending_music')
        ├── shows toast: "配乐生成中..."
        └── navigates to /

PendingMusicPoller (App-level, runs every 5s)
        │
        ├── reads localStorage, polls GET /api/music/status/:id
        ├── status='completed' → success toast + refresh user credits
        ├── status='failed'    → error toast
        └── timeout (5min)     → error toast

StoryDetailPage (on mount)
        └── if music.status='pending' → starts own 4s polling loop
            └── status='completed' → renders MusicPlayer
```
