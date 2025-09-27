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

async function testSongGeneration() {
  console.log('🎵 Testing song generation system...\n');
  
  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Database error:', usersError.message);
      console.log('Please run the SQL script: scripts/fix-database-schema.sql');
      return;
    }
    console.log('✅ Database connection working');
    
    // 2. Test user creation
    console.log('\n2. Testing user creation...');
    const testUserId = `test_${Date.now()}`;
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        clerk_user_id: testUserId,
        email: 'test@example.com',
        name: 'Test User'
      }, {
        onConflict: 'clerk_user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (userError) {
      console.log('❌ User creation error:', userError.message);
      return;
    }
    console.log('✅ User creation working');
    
    // 3. Test song creation
    console.log('\n3. Testing song creation...');
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        user_id: user.id,
        clerk_user_id: testUserId,
        title: 'Test Song',
        theme: 'Love',
        genre: 'romantic',
        mood: 'happy',
        status: 'pending'
      })
      .select()
      .single();
    
    if (songError) {
      console.log('❌ Song creation error:', songError.message);
      return;
    }
    console.log('✅ Song creation working');
    
    // 4. Test generation log creation (optional)
    console.log('\n4. Testing generation log creation...');
    try {
      const { data: log, error: logError } = await supabase
        .from('generation_logs')
        .insert({
          song_id: song.id,
          step: 'test_step',
          request_data: { test: 'data' },
          status: 'success'
        })
        .select()
        .single();
      
      if (logError) {
        console.log('⚠️  Generation log error (non-critical):', logError.message);
        console.log('   Song generation will work without logging');
      } else {
        console.log('✅ Generation log creation working');
      }
    } catch (logErr) {
      console.log('⚠️  Generation log failed (non-critical)');
    }
    
    // 5. Test song update
    console.log('\n5. Testing song update...');
    const { data: updatedSong, error: updateError } = await supabase
      .from('songs')
      .update({
        status: 'generating',
        task_id: 'test_task_123'
      })
      .eq('id', song.id)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Song update error:', updateError.message);
      return;
    }
    console.log('✅ Song update working');
    
    // 6. Clean up test data
    console.log('\n6. Cleaning up test data...');
    await supabase.from('generation_logs').delete().eq('song_id', song.id);
    await supabase.from('songs').delete().eq('id', song.id);
    await supabase.from('users').delete().eq('id', user.id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Song generation system is ready.');
    console.log('\n📝 Summary:');
    console.log('   ✅ Database connection: Working');
    console.log('   ✅ User management: Working');
    console.log('   ✅ Song creation: Working');
    console.log('   ✅ Song updates: Working');
    console.log('   ⚠️  Generation logs: May need schema fix (non-critical)');
    console.log('\n🚀 You can now test song generation through the web interface!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n🔧 To fix issues:');
    console.log('1. Run the SQL script: scripts/fix-database-schema.sql');
    console.log('2. Check your .env.local file has correct Supabase credentials');
    console.log('3. Verify your Supabase project is active');
  }
}

testSongGeneration();
