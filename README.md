# Amor - AI-Powered Hindi Music Generation

A modern web application that generates beautiful Hindi songs using artificial intelligence. Built with Next.js 14, Clerk authentication, and a beautiful UI powered by shadcn/ui.

## ✨ Features

- **🎵 AI Music Generation**: Create personalized Hindi songs with AI
- **🎨 Beautiful UI**: Modern, responsive design with smooth animations
- **🔐 Authentication**: Secure user authentication with Clerk
- **📱 Responsive**: Works perfectly on desktop and mobile devices
- **🎧 Audio Player**: Full-featured audio player with controls
- **📊 Dashboard**: Manage and organize your created songs
- **🎯 Genre Selection**: Choose from various Hindi music styles
- **💫 Mood-Based Creation**: Generate songs based on emotions
- **📝 Lyrics Display**: Beautiful lyrics presentation
- **🔄 Real-time Updates**: Live progress tracking during generation

## 🚀 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Authentication**: Clerk
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript
- **Icons**: Lucide React
- **Deployment**: Vercel

## Setup Instructions

### 1. Environment Variables

Copy `.env.local` and fill in your API keys:

```bash
# Gemini API Key (for lyrics generation and optimization)
GEMINI_API_KEY=your_gemini_api_key_here

# Suno API Key (for music generation via AI Music API)
SUNO_API_KEY=your_suno_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 2. Database Setup

1. Create a new Supabase project
2. Enable the pgvector extension in your Supabase dashboard
3. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
4. Configure Google OAuth in Supabase Auth settings

### 3. Lyrics Data Ingestion

Process the Hindi lyrics dataset:

```bash
npm run process-lyrics
```

This will:

- Parse `lyrics_data.csv` (5000 Hindi songs)
- Generate embeddings using Gemini API
- Store in Supabase with pgvector for similarity search

### 4. Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
├── lib/                 # Utility libraries
│   ├── supabase.ts     # Supabase client
│   ├── gemini.ts       # Gemini AI client
│   ├── auth.ts         # Authentication utilities
│   └── lyrics-processor.ts # Lyrics processing
└── utils/              # Helper utilities

scripts/
└── process-lyrics.ts   # Lyrics ingestion script
```

## API Routes

- `POST /api/generate-song` - Generate new song with lyrics and music
- `GET /api/songs/[id]` - Get specific song details
- `GET /api/songs` - Get user's songs

## Database Schema

- `users` - User profiles
- `songs` - Generated songs with metadata
- `lyrics_index` - Hindi lyrics with vector embeddings for similarity search

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
