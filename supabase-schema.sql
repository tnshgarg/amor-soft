-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    style_tags TEXT[] NOT NULL DEFAULT '{}',
    lyrics TEXT NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lyrics_index table with vector embeddings
CREATE TABLE IF NOT EXISTS lyrics_index (
    id SERIAL PRIMARY KEY,
    song_name TEXT NOT NULL,
    lyrics_text TEXT NOT NULL,
    embedding vector(768) -- Assuming 768-dimensional embeddings from Gemini
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lyrics_embedding ON lyrics_index USING ivfflat (embedding vector_cosine_ops);

-- Create function for similarity search
CREATE OR REPLACE FUNCTION match_lyrics(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id int,
    song_name text,
    lyrics_text text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lyrics_index.id,
        lyrics_index.song_name,
        lyrics_index.lyrics_text,
        1 - (lyrics_index.embedding <=> query_embedding) AS similarity
    FROM lyrics_index
    WHERE 1 - (lyrics_index.embedding <=> query_embedding) > match_threshold
    ORDER BY lyrics_index.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyrics_index ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Songs policies
CREATE POLICY "Users can view own songs" ON songs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own songs" ON songs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs" ON songs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs" ON songs
    FOR DELETE USING (auth.uid() = user_id);

-- Lyrics index is readable by all authenticated users for similarity search
CREATE POLICY "Authenticated users can read lyrics index" ON lyrics_index
    FOR SELECT TO authenticated USING (true);

-- Only service role can insert/update lyrics index
CREATE POLICY "Service role can manage lyrics index" ON lyrics_index
    FOR ALL TO service_role USING (true);
