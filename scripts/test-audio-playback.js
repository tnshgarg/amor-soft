require('dotenv').config({ path: '.env.local' });

console.log('🎵 Testing Audio Playback Issues\n');

async function testAudioPlayback() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    console.log('🔍 TESTING AUDIO PLAYBACK ISSUES:');
    console.log('=====================================');
    
    // Get songs with audio URLs
    const { data: songs, error } = await supabase
      .from('songs')
      .select('id, title, audio_url, status, created_at')
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Error fetching songs:', error.message);
      return;
    }
    
    if (!songs || songs.length === 0) {
      console.log('⚠️  No songs with audio URLs found');
      return;
    }
    
    console.log(`\n1. Found ${songs.length} songs with audio URLs:`);
    
    for (const song of songs) {
      console.log(`\n📱 Song: ${song.title}`);
      console.log(`   ID: ${song.id}`);
      console.log(`   Status: ${song.status}`);
      console.log(`   Audio URL: ${song.audio_url}`);
      
      // Check if it's a mock URL
      const isMockUrl = song.audio_url.includes('mock-audio-url') || 
                       song.audio_url.includes('example.com');
      
      if (isMockUrl) {
        console.log('   ⚠️  Mock URL detected - this explains playback issues');
        continue;
      }
      
      // Test if URL is accessible
      console.log('   🔍 Testing URL accessibility...');
      
      try {
        const response = await fetch(song.audio_url, { 
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });
        
        console.log(`   📊 Response status: ${response.status}`);
        console.log(`   📊 Content-Type: ${response.headers.get('content-type')}`);
        console.log(`   📊 Content-Length: ${response.headers.get('content-length')}`);
        console.log(`   📊 CORS headers: ${response.headers.get('access-control-allow-origin')}`);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.startsWith('audio/')) {
            console.log('   ✅ Audio file accessible and valid');
          } else {
            console.log('   ⚠️  URL accessible but may not be audio file');
          }
        } else {
          console.log('   ❌ URL not accessible');
        }
        
      } catch (fetchError) {
        console.log('   ❌ URL fetch failed:', fetchError.message);
        
        // Check if it's a CORS issue
        if (fetchError.message.includes('CORS') || fetchError.message.includes('fetch')) {
          console.log('   💡 This might be a CORS issue - audio might still work in browser');
        }
      }
      
      console.log(`   🌐 Test in browser: http://localhost:3001/songs/${song.id}`);
    }
    
    console.log('\n🎯 AUDIO PLAYBACK DIAGNOSIS:');
    console.log('=====================================');
    
    const mockUrls = songs.filter(s => 
      s.audio_url.includes('mock-audio-url') || s.audio_url.includes('example.com')
    ).length;
    
    const realUrls = songs.length - mockUrls;
    
    console.log(`📊 Mock URLs: ${mockUrls}/${songs.length}`);
    console.log(`📊 Real URLs: ${realUrls}/${songs.length}`);
    
    if (mockUrls > 0) {
      console.log('\n⚠️  MOCK URLS DETECTED:');
      console.log('   - Mock URLs cannot be played');
      console.log('   - These are placeholder URLs from failed API calls');
      console.log('   - Download might work if it uses a different mechanism');
      console.log('   - Need real Suno API URLs for playback');
    }
    
    if (realUrls > 0) {
      console.log('\n✅ REAL URLS FOUND:');
      console.log('   - These should be playable');
      console.log('   - If they still don\'t play, check browser console for errors');
      console.log('   - CORS issues might prevent playback');
      console.log('   - Audio format compatibility issues possible');
    }
    
    console.log('\n🔧 DEBUGGING STEPS:');
    console.log('=====================================');
    console.log('1. Open browser console (F12)');
    console.log('2. Go to a song page with real audio URL');
    console.log('3. Click play button');
    console.log('4. Check console for detailed error messages');
    console.log('5. Look for:');
    console.log('   - "🎵 Setting audio source: [URL]"');
    console.log('   - "✅ Audio metadata loaded"');
    console.log('   - "▶️ Attempting to play audio"');
    console.log('   - Any error messages');
    
    console.log('\n💡 POSSIBLE SOLUTIONS:');
    console.log('=====================================');
    console.log('✅ Added crossOrigin="anonymous" to audio element');
    console.log('✅ Added comprehensive error logging');
    console.log('✅ Added audio loading validation');
    console.log('✅ Added force reload with audio.load()');
    console.log('');
    console.log('If issues persist:');
    console.log('- Check if Suno API is returning valid audio URLs');
    console.log('- Verify audio file format compatibility');
    console.log('- Test direct URL access in browser');
    console.log('- Check network tab for failed requests');
    
  } catch (error) {
    console.error('💥 Audio playback test failed:', error);
  }
}

testAudioPlayback();
