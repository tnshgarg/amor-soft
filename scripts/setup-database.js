const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Required variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🚀 Setting up Amor database...\n');
  
  try {
    // Test connection first
    console.log('1. Testing Supabase connection...');
    const { data, error } = await supabase.from('_').select('*').limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    console.log('✅ Connected to Supabase successfully\n');
    
    // Read the SQL file
    console.log('2. Reading SQL setup script...');
    const sqlPath = path.join(__dirname, 'complete-database-setup.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error('SQL file not found: complete-database-setup.sql');
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ SQL script loaded successfully\n');
    
    // Display instructions
    console.log('3. Manual SQL execution required:');
    console.log('=' .repeat(80));
    console.log('🔧 SETUP INSTRUCTIONS:');
    console.log('');
    console.log('1. Go to your Supabase dashboard:');
    console.log(`   https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`);
    console.log('');
    console.log('2. Click "New Query" or use the SQL Editor');
    console.log('');
    console.log('3. Copy and paste the ENTIRE contents of:');
    console.log(`   ${sqlPath}`);
    console.log('');
    console.log('4. Click "Run" to execute the script');
    console.log('');
    console.log('5. You should see success messages at the end');
    console.log('');
    console.log('=' .repeat(80));
    
    // Test if tables already exist
    console.log('\n4. Checking current database state...');
    
    const tables = ['users', 'songs', 'generation_logs', 'personas'];
    const tableStatus = {};
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        tableStatus[table] = error ? '❌ Missing' : '✅ Exists';
      } catch (err) {
        tableStatus[table] = '❌ Missing';
      }
    }
    
    console.log('\nCurrent table status:');
    Object.entries(tableStatus).forEach(([table, status]) => {
      console.log(`  ${table}: ${status}`);
    });
    
    const allTablesExist = Object.values(tableStatus).every(status => status.includes('✅'));
    
    if (allTablesExist) {
      console.log('\n🎉 All tables already exist! Your database is ready.');
      
      // Test basic operations
      console.log('\n5. Testing database operations...');
      
      // Test user creation
      const testUserId = `test_${Date.now()}`;
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: testUserId,
          email: 'test@example.com',
          name: 'Test User'
        })
        .select()
        .single();
      
      if (userError) {
        console.log('❌ User creation test failed:', userError.message);
      } else {
        console.log('✅ User creation test passed');
        
        // Test song creation
        const { data: song, error: songError } = await supabase
          .from('songs')
          .insert({
            user_id: user.id,
            clerk_user_id: testUserId,
            title: 'Test Song',
            theme: 'Love',
            genre: 'Romantic',
            mood: 'Happy'
          })
          .select()
          .single();
        
        if (songError) {
          console.log('❌ Song creation test failed:', songError.message);
        } else {
          console.log('✅ Song creation test passed');
          
          // Clean up test data
          await supabase.from('songs').delete().eq('id', song.id);
          await supabase.from('users').delete().eq('id', user.id);
          console.log('✅ Test data cleaned up');
        }
      }
      
      console.log('\n🚀 Database is fully functional!');
      console.log('🎵 Your Amor application is ready to generate music!');
      
    } else {
      console.log('\n⚠️  Some tables are missing. Please run the SQL script as instructed above.');
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Please run the SQL script manually in your Supabase dashboard.');
  }
}

// Show the SQL content for easy copying
function showSQLContent() {
  console.log('\n📋 SQL SCRIPT CONTENT (copy this to Supabase):');
  console.log('=' .repeat(80));
  
  const sqlPath = path.join(__dirname, 'complete-database-setup.sql');
  if (fs.existsSync(sqlPath)) {
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(sqlContent);
  } else {
    console.log('❌ SQL file not found');
  }
  
  console.log('=' .repeat(80));
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--show-sql')) {
  showSQLContent();
} else {
  setupDatabase();
}
