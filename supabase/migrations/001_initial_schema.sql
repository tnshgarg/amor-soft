-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Clerk user data)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL, -- For direct lookup without join
  
  -- Song metadata
  title TEXT NOT NULL,
  theme TEXT,
  genre TEXT,
  mood TEXT,
  duration INTEGER, -- in seconds
  
  -- AI generation data
  task_id TEXT, -- Suno API task ID
  clip_id TEXT, -- Suno clip ID
  persona_id TEXT, -- Suno persona ID
  
  -- Generated content
  lyrics TEXT,
  tags TEXT,
  
  -- URLs from Suno API
  audio_url TEXT,
  video_url TEXT,
  image_url TEXT,
  
  -- Generation status
  status TEXT DEFAULT 'pending', -- pending, generating, completed, failed
  error_message TEXT,
  
  -- User interaction
  is_liked BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_clerk_user_id ON songs(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(status);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_task_id ON songs(task_id);
CREATE INDEX IF NOT EXISTS idx_songs_clip_id ON songs(clip_id);

-- Create generation_logs table for tracking API calls
CREATE TABLE IF NOT EXISTS generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  step TEXT NOT NULL, -- lyrics_generation, persona_creation, music_generation
  request_data JSONB,
  response_data JSONB,
  status TEXT NOT NULL, -- success, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personas table for reusable voice personas
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  suno_persona_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  source_clip_id TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (clerk_user_id = current_setting('app.current_user_id', true));

-- Songs policies
CREATE POLICY "Users can view own songs" ON songs
  FOR SELECT USING (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own songs" ON songs
  FOR INSERT WITH CHECK (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own songs" ON songs
  FOR UPDATE USING (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete own songs" ON songs
  FOR DELETE USING (clerk_user_id = current_setting('app.current_user_id', true));

-- Generation logs policies
CREATE POLICY "Users can view own generation logs" ON generation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = generation_logs.song_id 
      AND songs.clerk_user_id = current_setting('app.current_user_id', true)
    )
  );

-- Personas policies
CREATE POLICY "Users can view own personas" ON personas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = personas.user_id 
      AND users.clerk_user_id = current_setting('app.current_user_id', true)
    )
  );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
