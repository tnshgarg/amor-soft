-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
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
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  is_liked BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create generation_logs table
CREATE TABLE IF NOT EXISTS generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personas table
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  voice_characteristics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_clerk_user_id ON songs(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(status);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_logs_song_id ON generation_logs(song_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_task_id ON generation_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create RLS policies for songs table
CREATE POLICY "Users can view their own songs" ON songs
  FOR SELECT USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own songs" ON songs
  FOR INSERT WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own songs" ON songs
  FOR UPDATE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own songs" ON songs
  FOR DELETE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create RLS policies for generation_logs table
CREATE POLICY "Users can view logs for their songs" ON generation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM songs 
      WHERE songs.id = generation_logs.song_id 
      AND songs.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Create RLS policies for personas table
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
