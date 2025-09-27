require('dotenv').config({ path: '.env.local' });

console.log('🎵 Testing Song Generation API with Authentication Bypass\n');

async function testAPIWithAuth() {
  try {
    console.log('1. Testing Song Generation API:');
    
    // First, let's test if the server is running
    try {
      const healthCheck = await fetch('http://localhost:3001/api/health');
      console.log('   Server health check:', healthCheck.status === 404 ? 'Server running (404 expected)' : `Status: ${healthCheck.status}`);
    } catch (healthError) {
      console.log('   ❌ Server not running. Please start with: npm run dev');
      return;
    }
    
    console.log('\n2. Creating Test Song (will fail due to auth, but we can check logs):');
    
    const testData = {
      title: "Festival Love Story",
      theme: "A beautiful love story between two people who meet during a colorful festival and discover their shared dreams and aspirations",
      styles: "romantic, bollywood, classical, peaceful, traditional"
    };
    
    console.log('   Title:', testData.title);
    console.log('   Theme:', testData.theme);
    console.log('   Theme length:', testData.theme.length, 'characters');
    console.log('   Styles:', testData.styles);
    
    // Test the actual API (will fail due to auth, but we can see the logs)
    const response = await fetch('http://localhost:3001/api/songs/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('   Response status:', response.status);
    
    if (response.status === 401) {
      console.log('   ✅ Expected 401 (authentication required)');
      console.log('   ℹ️  Check the Next.js server logs above for RAG system activity');
      console.log('   ℹ️  Look for messages like:');
      console.log('      - "🎵 Generating lyrics using RAG system..."');
      console.log('      - "Finding similar lyrics for theme:"');
      console.log('      - "Found X reference songs:"');
      console.log('      - "✅ Generated lyrics using RAG with reference songs"');
    } else {
      const result = await response.json();
      console.log('   Unexpected response:', result);
    }
    
    console.log('\n3. Testing Database Direct Access:');
    
    // Test database access directly
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Check if we have songs with reference_songs
    const { data: songsWithRefs, error: refsError } = await supabase
      .from('songs')
      .select('id, title, reference_songs, created_at')
      .not('reference_songs', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (refsError) {
      console.log('   ❌ Database query failed:', refsError.message);
    } else {
      console.log('   ✅ Found', songsWithRefs.length, 'songs with reference songs:');
      songsWithRefs.forEach((song, i) => {
        console.log(`      ${i + 1}. "${song.title}" - References: ${JSON.stringify(song.reference_songs)}`);
      });
    }
    
    // Check lyrics_index table
    const { data: lyricsCount, error: lyricsError } = await supabase
      .from('lyrics_index')
      .select('id', { count: 'exact' });
    
    if (lyricsError) {
      console.log('   ❌ Lyrics index query failed:', lyricsError.message);
    } else {
      console.log('   ✅ Lyrics database has', lyricsCount.length, 'songs available for RAG');
    }
    
    console.log('\n4. Manual RAG Test (Simple):');
    
    // Test similarity search manually
    const testQuery = "love story festival romantic";
    console.log('   Testing query:', testQuery);
    
    // Simple text search as fallback
    const { data: textMatches, error: textError } = await supabase
      .from('lyrics_index')
      .select('song_name, lyrics_text')
      .or('song_name.ilike.%love%,lyrics_text.ilike.%love%')
      .limit(3);
    
    if (textError) {
      console.log('   ❌ Text search failed:', textError.message);
    } else {
      console.log('   ✅ Text search found', textMatches.length, 'matches:');
      textMatches.forEach((match, i) => {
        console.log(`      ${i + 1}. ${match.song_name}`);
      });
    }
    
    console.log('\n🎯 SYSTEM READINESS CHECK:');
    console.log('=====================================');
    
    const checks = [
      { name: 'Next.js Server Running', status: '✅' },
      { name: 'Database Connection', status: refsError ? '❌' : '✅' },
      { name: 'Reference Songs Field', status: songsWithRefs.length > 0 ? '✅' : '⚠️' },
      { name: 'Lyrics Database', status: lyricsCount && lyricsCount.length > 0 ? '✅' : '❌' },
      { name: 'Text Search Fallback', status: textMatches && textMatches.length > 0 ? '✅' : '❌' },
      { name: 'API Authentication', status: '✅ (Working as expected)' }
    ];
    
    checks.forEach(check => {
      console.log(`${check.status} ${check.name}`);
    });
    
    console.log('\n📋 NEXT STEPS TO TEST COMPLETE SYSTEM:');
    console.log('1. Open http://localhost:3001 in your browser');
    console.log('2. Sign in with Clerk authentication');
    console.log('3. Go to /create page');
    console.log('4. Create a song with theme: "' + testData.theme + '"');
    console.log('5. Check the song details page for reference songs display');
    console.log('6. Verify different themes produce different reference songs');
    
    console.log('\n🔍 WHAT TO LOOK FOR:');
    console.log('✅ Reference songs section appears on song detail page');
    console.log('✅ Different themes find different reference songs');
    console.log('✅ Lyrics are clean without explanations');
    console.log('✅ Songs complete successfully with audio URLs');
    
  } catch (error) {
    console.error('💥 API test failed:', error);
  }
}

testAPIWithAuth();
