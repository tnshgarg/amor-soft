const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTables() {
  console.log('Creating database tables...');
  
  try {
    // Test if we can create a simple table first
    console.log('Testing table creation...');
    
    // Try to create users table using a simple approach
    const { error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (testError && testError.code === 'PGRST116') {
      console.log('Tables do not exist. Please run the following SQL in your Supabase dashboard:');
      console.log('\n' + '='.repeat(80));
      console.log(`
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
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
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  is_liked BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_clerk_user_id ON songs(clerk_user_id);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_created_at ON songs(created_at);

-- Enable Row Level Security (optional for now)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
      `);
      console.log('='.repeat(80));
      console.log('\nGo to: https://supabase.com/dashboard/project/[your-project]/sql');
      console.log('Paste the above SQL and click "Run"');
      console.log('\nAfter running the SQL, restart your Next.js application.');
    } else {
      console.log('✓ Tables already exist or connection successful');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTables();
