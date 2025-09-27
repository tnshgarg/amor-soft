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

async function testDatabase() {
  console.log('Testing database connection and tables...\n');
  
  try {
    // Test 1: Check if users table exists
    console.log('1. Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
      if (usersError.code === 'PGRST116') {
        console.log('   → Table does not exist. Please run the SQL migration.');
      }
    } else {
      console.log('✅ Users table exists and accessible');
    }
    
    // Test 2: Check if songs table exists
    console.log('\n2. Testing songs table...');
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .limit(1);
    
    if (songsError) {
      console.log('❌ Songs table error:', songsError.message);
      if (songsError.code === 'PGRST116') {
        console.log('   → Table does not exist. Please run the SQL migration.');
      }
    } else {
      console.log('✅ Songs table exists and accessible');
    }
    
    // Test 3: Try to create a test user
    console.log('\n3. Testing user creation...');
    const testUserId = 'test_user_' + Date.now();
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: testUserId,
        email: 'test@example.com',
        name: 'Test User'
      })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ User creation error:', createError.message);
    } else {
      console.log('✅ User creation successful:', newUser.id);
      
      // Test 4: Try to create a test song
      console.log('\n4. Testing song creation...');
      const { data: newSong, error: songError } = await supabase
        .from('songs')
        .insert({
          user_id: newUser.id,
          clerk_user_id: testUserId,
          title: 'Test Song',
          theme: 'Love',
          genre: 'Romantic',
          mood: 'Happy',
          status: 'pending'
        })
        .select()
        .single();
      
      if (songError) {
        console.log('❌ Song creation error:', songError.message);
      } else {
        console.log('✅ Song creation successful:', newSong.id);
        
        // Clean up test data
        console.log('\n5. Cleaning up test data...');
        await supabase.from('songs').delete().eq('id', newSong.id);
        await supabase.from('users').delete().eq('id', newUser.id);
        console.log('✅ Test data cleaned up');
      }
    }
    
    console.log('\n🎉 Database test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabase();
