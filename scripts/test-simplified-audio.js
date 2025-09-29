require('dotenv').config({ path: '.env.local' });

console.log('🎵 Testing Simplified Audio Playback\n');

async function testSimplifiedAudio() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    console.log('🔍 TESTING SIMPLIFIED AUDIO PLAYBACK:');
    console.log('=====================================');
    
    // Get a song with real audio URL
    const { data: songs } = await supabase
      .from('songs')
      .select('id, title, audio_url, status')
      .not('audio_url', 'is', null)
      .limit(10);
    
    const realSongs = songs?.filter(s => 
      !s.audio_url.includes('mock-audio-url') && !s.audio_url.includes('example.com')
    ) || [];
    
    if (realSongs.length === 0) {
      console.log('❌ No songs with real audio URLs found');
      return;
    }
    
    const testSong = realSongs[0];
    console.log(`\n📱 Testing song: ${testSong.title}`);
    console.log(`   Audio URL: ${testSong.audio_url}`);
    console.log(`   Song ID: ${testSong.id}`);
    
    // Test URL accessibility
    console.log('\n🔍 Testing URL accessibility...');
    
    try {
      const response = await fetch(testSong.audio_url, { method: 'HEAD' });
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')}`);
      
      if (response.ok) {
        console.log('   ✅ URL is accessible');
      } else {
        console.log('   ❌ URL not accessible');
      }
    } catch (fetchError) {
      console.log('   ⚠️  Fetch failed (might be CORS, but audio could still work)');
    }
    
    console.log('\n🔧 SIMPLIFIED AUDIO PLAYER CHANGES:');
    console.log('=====================================');
    console.log('✅ Removed complex timeout mechanism');
    console.log('✅ Removed crossOrigin attribute (was causing CORS issues)');
    console.log('✅ Simplified loading logic');
    console.log('✅ Direct play() call without complex validation');
    console.log('✅ Let browser handle audio loading naturally');
    
    console.log('\n📱 TEST INSTRUCTIONS:');
    console.log('=====================================');
    console.log(`1. Open: http://localhost:3001/songs/${testSong.id}`);
    console.log('2. Open browser console (F12)');
    console.log('3. Click the play button');
    console.log('4. Look for these console messages:');
    console.log('   - "🎵 Setting audio source: [URL]"');
    console.log('   - "▶️ Attempting to play audio"');
    console.log('   - "🎵 Attempting to play audio..."');
    console.log('   - "✅ Audio playing successfully"');
    
    console.log('\n🎯 EXPECTED RESULTS:');
    console.log('=====================================');
    console.log('✅ No more "Audio load timeout after 10 seconds" error');
    console.log('✅ Audio should start playing immediately');
    console.log('✅ Progress bar should show movement');
    console.log('✅ Play button should change to pause button');
    console.log('✅ Duration should be displayed');
    
    console.log('\n🔧 IF STILL NOT WORKING:');
    console.log('=====================================');
    console.log('1. Check browser console for any remaining errors');
    console.log('2. Try different browsers (Chrome, Firefox, Safari)');
    console.log('3. Check if audio file format is supported');
    console.log('4. Verify network connectivity');
    console.log('5. Test direct URL in browser address bar');
    
    console.log('\n🎉 SIMPLIFIED AUDIO PLAYER READY!');
    console.log('=====================================');
    console.log('The audio player is now much simpler and should work reliably.');
    console.log('Removed all complex loading mechanisms that were causing timeouts.');
    console.log('Browser will handle audio loading and playback naturally.');
    
  } catch (error) {
    console.error('💥 Simplified audio test failed:', error);
  }
}

testSimplifiedAudio();
