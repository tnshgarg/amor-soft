-- =====================================================
-- AMOR - AI Hindi Music Generation Platform
-- Complete Database Setup Script
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/[your-project]/sql
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- DROP EXISTING TABLES (if they exist)
-- =====================================================
DROP TABLE IF EXISTS generation_logs CASCADE;
DROP TABLE IF EXISTS personas CASCADE;
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Songs table
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    theme TEXT,
    genre TEXT,
    mood TEXT,
    duration INTEGER,
    task_id TEXT,
    clip_id TEXT,
    persona_id TEXT,
    lyrics TEXT,
    tags TEXT,
    audio_url TEXT,
    video_url TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    error_message TEXT,
    is_liked BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Generation logs table
CREATE TABLE generation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personas table
CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    persona_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    voice_characteristics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Songs indexes
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_clerk_user_id ON songs(clerk_user_id);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX idx_songs_genre ON songs(genre);
CREATE INDEX idx_songs_mood ON songs(mood);
CREATE INDEX idx_songs_is_liked ON songs(is_liked);
CREATE INDEX idx_songs_task_id ON songs(task_id);

-- Generation logs indexes
CREATE INDEX idx_generation_logs_song_id ON generation_logs(song_id);
CREATE INDEX idx_generation_logs_task_id ON generation_logs(task_id);
CREATE INDEX idx_generation_logs_status ON generation_logs(status);
CREATE INDEX idx_generation_logs_created_at ON generation_logs(created_at DESC);

-- Personas indexes
CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_persona_id ON personas(persona_id);

-- =====================================================
-- CREATE FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Songs policies
CREATE POLICY "Users can view their own songs" ON songs
    FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own songs" ON songs
    FOR INSERT WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own songs" ON songs
    FOR UPDATE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own songs" ON songs
    FOR DELETE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Generation logs policies
CREATE POLICY "Users can view logs for their songs" ON generation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM songs 
            WHERE songs.id = generation_logs.song_id 
            AND songs.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Personas policies
CREATE POLICY "Users can view their own personas" ON personas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = personas.user_id 
            AND users.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can insert their own personas" ON personas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = personas.user_id 
            AND users.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- =====================================================
-- INSERT SAMPLE DATA (Optional)
-- =====================================================

-- You can uncomment this section to add sample data for testing
/*
INSERT INTO users (clerk_user_id, email, name) VALUES 
('sample_user_1', 'demo@example.com', 'Demo User');

INSERT INTO songs (user_id, clerk_user_id, title, theme, genre, mood, status, lyrics) VALUES 
((SELECT id FROM users WHERE clerk_user_id = 'sample_user_1'), 
 'sample_user_1', 
 'Sample Hindi Song', 
 'Love', 
 'Romantic', 
 'Happy', 
 'completed',
 'तेरे प्यार में खो गया हूँ मैं...');
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'songs', 'generation_logs', 'personas')
ORDER BY tablename;

-- Check indexes
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'songs', 'generation_logs', 'personas')
ORDER BY tablename, indexname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Database setup completed successfully!';
    RAISE NOTICE '✅ All tables, indexes, and policies created';
    RAISE NOTICE '🚀 Your Amor application is now ready to use!';
END $$;
