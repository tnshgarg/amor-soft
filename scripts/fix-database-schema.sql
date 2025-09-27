-- =====================================================
-- AMOR - Fix Database Schema to Match Code
-- =====================================================
-- Run this in your Supabase SQL Editor to fix the schema mismatch
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS generation_logs CASCADE;
DROP TABLE IF EXISTS personas CASCADE;
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create songs table
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

-- Create generation logs table (matching the TypeScript interface)
CREATE TABLE generation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    request_data JSONB,
    response_data JSONB,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personas table
CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    persona_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    voice_characteristics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_clerk_user_id ON songs(clerk_user_id);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX idx_songs_genre ON songs(genre);
CREATE INDEX idx_songs_mood ON songs(mood);
CREATE INDEX idx_songs_is_liked ON songs(is_liked);
CREATE INDEX idx_songs_task_id ON songs(task_id);

CREATE INDEX idx_generation_logs_song_id ON generation_logs(song_id);
CREATE INDEX idx_generation_logs_step ON generation_logs(step);
CREATE INDEX idx_generation_logs_status ON generation_logs(status);
CREATE INDEX idx_generation_logs_created_at ON generation_logs(created_at DESC);

CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_persona_id ON personas(persona_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a test user for verification
INSERT INTO users (clerk_user_id, email, name) VALUES 
('test_user_123', 'test@amor.com', 'Test User');

-- Verification queries
SELECT 'Database schema fixed successfully!' as message;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as song_count FROM songs;
SELECT COUNT(*) as log_count FROM generation_logs;

-- Show table structure for verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'songs', 'generation_logs', 'personas')
ORDER BY table_name, ordinal_position;
