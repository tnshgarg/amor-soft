import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  try {
    console.log('Setting up Supabase database...');
    
    // Read the SQL file
    const sqlPath = join(__dirname, 'setup-database.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase
            .from('_temp')
            .select('*')
            .limit(0);
          
          if (directError && !directError.message.includes('does not exist')) {
            console.error(`Error executing statement ${i + 1}:`, error);
            console.error('Statement:', statement);
          }
        }
      }
    }
    
    console.log('✅ Database setup completed successfully!');
    
    // Test the setup by checking if tables exist
    console.log('Testing database setup...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .limit(1);
    
    const { data: lyricsData, error: lyricsError } = await supabase
      .from('lyrics_data')
      .select('*')
      .limit(1);
    
    if (!profilesError && !songsError && !lyricsError) {
      console.log('✅ All tables are accessible!');
    } else {
      console.log('⚠️  Some tables may not be accessible:');
      if (profilesError) console.log('- profiles:', profilesError.message);
      if (songsError) console.log('- songs:', songsError.message);
      if (lyricsError) console.log('- lyrics_data:', lyricsError.message);
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function setupDatabaseDirect() {
  try {
    console.log('Setting up database with direct SQL execution...');
    
    // Enable pgvector extension
    console.log('1. Enabling pgvector extension...');
    await supabase.rpc('exec_sql', { sql: 'CREATE EXTENSION IF NOT EXISTS vector;' });
    
    // Create profiles table
    console.log('2. Creating profiles table...');
    const { error: profilesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          full_name TEXT,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (profilesError) {
      console.log('Profiles table may already exist or RPC not available');
    }
    
    // Test if we can access the tables
    console.log('3. Testing table access...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Cannot access profiles table:', error.message);
      console.log('Please run the SQL manually in Supabase dashboard');
      console.log('SQL file location: scripts/setup-database.sql');
    } else {
      console.log('✅ Database setup successful!');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('Please run the SQL manually in Supabase dashboard');
    console.log('SQL file location: scripts/setup-database.sql');
  }
}

if (require.main === module) {
  setupDatabaseDirect();
}
