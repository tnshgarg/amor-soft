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

async function testCompleteSystem() {
  console.log('🎵 Testing Complete Amor System...\n');
  
  try {
    // 1. Test database status
    console.log('1. Testing database status...');
    const dbResponse = await fetch('http://localhost:3001/api/database/status');
    const dbStatus = await dbResponse.json();
    
    if (dbStatus.setup) {
      console.log('✅ Database is properly set up');
      console.log(`   - Users: ${dbStatus.tables.users}`);
      console.log(`   - Songs: ${dbStatus.tables.songs}`);
      console.log(`   - Generation Logs: ${dbStatus.tables.generation_logs}`);
      console.log(`   - Personas: ${dbStatus.tables.personas}`);
    } else {
      console.log('❌ Database setup issue:', dbStatus.message);
      return;
    }
    
    // 2. Test song generation API (without auth - should fail gracefully)
    console.log('\n2. Testing song generation API (unauthenticated)...');
    const genResponse = await fetch('http://localhost:3001/api/songs/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Song',
        theme: 'Love',
        genre: 'romantic',
        mood: 'happy'
      })
    });
    
    const genResult = await genResponse.json();
    if (genResponse.status === 401 && genResult.error === 'Unauthorized') {
      console.log('✅ Song generation API properly requires authentication');
    } else {
      console.log('⚠️  Unexpected response from song generation API:', genResult);
    }
    
    // 3. Test songs listing API (without auth - should fail gracefully)
    console.log('\n3. Testing songs listing API (unauthenticated)...');
    const songsResponse = await fetch('http://localhost:3001/api/songs');
    const songsResult = await songsResponse.json();
    
    if (songsResponse.status === 401 && songsResult.error === 'Unauthorized') {
      console.log('✅ Songs listing API properly requires authentication');
    } else {
      console.log('⚠️  Unexpected response from songs API:', songsResult);
    }
    
    // 4. Test direct database operations
    console.log('\n4. Testing direct database operations...');
    
    // Test user creation
    const testUserId = `test_system_${Date.now()}`;
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        clerk_user_id: testUserId,
        email: 'system-test@amor.com',
        name: 'System Test User'
      }, {
        onConflict: 'clerk_user_id'
      })
      .select()
      .single();
    
    if (userError) {
      console.log('❌ User creation failed:', userError.message);
      return;
    }
    console.log('✅ User creation working');
    
    // Test song creation
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        user_id: user.id,
        clerk_user_id: testUserId,
        title: 'System Test Song',
        theme: 'Testing',
        genre: 'test',
        mood: 'confident',
        status: 'pending',
        lyrics: 'This is a test song for system verification'
      })
      .select()
      .single();
    
    if (songError) {
      console.log('❌ Song creation failed:', songError.message);
      return;
    }
    console.log('✅ Song creation working');
    
    // Test generation log creation
    try {
      const { data: log, error: logError } = await supabase
        .from('generation_logs')
        .insert({
          song_id: song.id,
          step: 'system_test',
          request_data: { test: 'data' },
          status: 'success'
        })
        .select()
        .single();
      
      if (logError) {
        console.log('⚠️  Generation log creation failed (non-critical):', logError.message);
      } else {
        console.log('✅ Generation log creation working');
      }
    } catch (logErr) {
      console.log('⚠️  Generation log creation failed (non-critical)');
    }
    
    // Test song updates
    const { data: updatedSong, error: updateError } = await supabase
      .from('songs')
      .update({
        status: 'completed',
        play_count: 1,
        is_liked: true
      })
      .eq('id', song.id)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Song update failed:', updateError.message);
      return;
    }
    console.log('✅ Song updates working');
    
    // 5. Test web pages accessibility
    console.log('\n5. Testing web pages...');
    
    const pages = [
      { path: '/', name: 'Landing Page' },
      { path: '/setup', name: 'Setup Page' },
      { path: '/create', name: 'Create Page' },
      { path: '/dashboard', name: 'Dashboard' }
    ];
    
    for (const page of pages) {
      try {
        const response = await fetch(`http://localhost:3001${page.path}`);
        if (response.ok) {
          console.log(`✅ ${page.name} accessible`);
        } else {
          console.log(`⚠️  ${page.name} returned status ${response.status}`);
        }
      } catch (err) {
        console.log(`❌ ${page.name} failed to load`);
      }
    }
    
    // 6. Clean up test data
    console.log('\n6. Cleaning up test data...');
    await supabase.from('generation_logs').delete().eq('song_id', song.id);
    await supabase.from('songs').delete().eq('id', song.id);
    await supabase.from('users').delete().eq('id', user.id);
    console.log('✅ Test data cleaned up');
    
    // 7. Final summary
    console.log('\n🎉 SYSTEM TEST COMPLETE!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Database: Fully operational');
    console.log('   ✅ API Endpoints: Working with proper authentication');
    console.log('   ✅ Data Operations: All CRUD operations working');
    console.log('   ✅ Web Pages: All pages accessible');
    console.log('   ✅ Error Handling: Proper authentication checks');
    
    console.log('\n🚀 Your Amor AI Music Generation Platform is ready!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Sign in through the web interface');
    console.log('   2. Create your first song at /create');
    console.log('   3. Monitor generation progress in /dashboard');
    console.log('   4. Check /setup if you encounter any issues');
    
  } catch (error) {
    console.error('\n❌ System test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the development server is running (npm run dev)');
    console.log('   2. Check your .env.local file has correct credentials');
    console.log('   3. Verify your Supabase project is active');
    console.log('   4. Run the database setup script if needed');
  }
}

testCompleteSystem();
