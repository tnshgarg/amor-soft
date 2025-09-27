# Amor — Technical PRD (Next.js + Supabase + MCP)

## 1. Overview

Amor is a premium custom song generation web platform. The system integrates Next.js frontend (with shadcn components), Supabase backend, and AI Music API MCP Server (wrapping Suno). It leverages VS Code Augment MCP for developer workflow. Gemini 2.5 Pro is used as an optimizer for prompt refinement and lyrics guidance.

---

## 2. Architecture

### Frontend

- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui (Radix primitives + Tailwind)
- **Auth**: Supabase Auth (Google provider)
- **Pages**:

  - `/` — Landing page
  - `/dashboard` — Authenticated user hub
  - `/create` — Song creation wizard
  - `/songs/[id]` — Song details and playback

### Backend

- **Supabase Postgres**: Primary database
- **pgvector**: Embedding search for lyrics_data.csv
- **Auth**: Google sign-in
- **Storage**: Supabase Storage for generated audio/lyrics files
- **APIs**: Implemented as Next.js API routes (`/api/*`) that communicate with Supabase DB and Suno via AI Music API MCP.
- **Lyrics Ingestion**: `lyrics_data.csv` (5000 songs) → embeddings → stored in `lyrics_index`

### AI Layer

- **AI Music API MCP Server**: Handles Suno API requests for generating music from lyrics.
- **shadcn MCP Server**: Assists with UI scaffolding during dev.
- **Gemini 2.5 Pro**: Used for prompt optimization, lyrics refinement, and adapter between user prompt + style tags → structured input for Suno.

---

## 3. Data Flow

1. User logs in with Google (Supabase Auth).
2. User enters a **prompt** (occasion / theme / dedication).
3. User selects **style tags** (romantic, retro, energetic, etc.).
4. Backend fetches similar lyrics from `lyrics_index` using embeddings.
5. Gemini refines prompt + retrieved context → structured lyrics prompt.
6. Next.js API route calls AI Music API MCP Server (Suno) → generates lyrics + melody.
7. Generated audio + metadata stored in Supabase (Storage + DB).
8. User can listen, download, or share from `/songs/[id]`.

---

## 4. Database Schema (Supabase)

### `users`

- `id` (UUID, PK)
- `email`
- `created_at`

### `songs`

- `id` (UUID, PK)
- `user_id` (FK → users)
- `title`
- `prompt`
- `style_tags` (text\[])
- `lyrics` (text)
- `audio_url` (text)
- `created_at`

### `lyrics_index`

- `id` (serial PK)
- `song_name`
- `lyrics_text`
- `embedding` (vector)

---

## 5. APIs / Endpoints

### Next.js API Routes

- `POST /api/generate-song`

  - Input: `{ prompt, style_tags }`
  - Steps:

    1. Retrieve top-N lyrics matches via pgvector.
    2. Gemini refines lyrics prompt.
    3. Call AI Music API MCP → Suno.
    4. Save output (lyrics, audio) to Supabase.

  - Output: `{ song_id }`

- `GET /api/songs/[id]`

  - Fetch a song with lyrics + audio URL.

- `GET /api/songs`

  - Fetch all songs for authenticated user.

---

## 6. UI Flows

- **Create Song Wizard**

  1. Prompt input box (with hint text)
  2. Style tag selector (multi-select, chips)
  3. "Generate" button → calls `/api/generate-song`
  4. Loading state with progress
  5. Redirect to `/songs/[id]`

- **Song Detail Page**

  - Embedded audio player
  - Lyrics view
  - Actions: Download MP3, Share

---

## 7. Deployment

- **Frontend**: Vercel (Next.js)
- **Backend**: Supabase (DB, Auth, Storage)
- **API Layer**: Next.js API routes
- **Secrets**: Managed via Vercel + Supabase config

---

## 8. Dev Tools

- **MCP Servers**: AI Music API MCP, shadcn MCP
- **VS Code Augment Extension**: For assisted code generation (understanding API docs)
- **Testing**: Jest + Playwright for UI, Supabase test DB for backend

---

## 9. Next Steps

1. Write ingestion script to load `lyrics_data.csv` into Supabase + pgvector.
2. Define `/api/generate-song` with Gemini + MCP integration.
3. Scaffold Next.js frontend with shadcn UI and Supabase Auth.
4. Build Create Song Wizard + Song Detail page.
5. Deploy MVP to Vercel + Supabase.

---
