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

async function createUsersTable() {
  console.log('Creating users table...\n');
  
  try {
    // Since we can't execute raw SQL easily, let's try a different approach
    // Let's check what tables exist first
    console.log('Checking existing tables...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Error checking tables:', tablesError);
    } else {
      console.log('Existing tables:', tables.map(t => t.table_name));
    }
    
    // Since we can't create tables via the client, let's provide the SQL
    console.log('\n=== MANUAL STEP REQUIRED ===');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log('(Go to: https://supabase.com/dashboard/project/[your-project]/sql)');
    console.log('\n' + '='.repeat(60));
    console.log(`
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);

-- Enable RLS (optional)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    `);
    console.log('='.repeat(60));
    console.log('\nAfter running this SQL, your application will be fully functional!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createUsersTable();
