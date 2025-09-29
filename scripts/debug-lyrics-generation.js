require('dotenv').config({ path: '.env.local' });

console.log('🎵 Debugging Lyrics Generation Issue\n');

async function debugLyricsGeneration() {
  try {
    console.log('🔍 DEBUGGING LYRICS GENERATION:');
    console.log('=====================================');
    
    // Test 1: Check Gemini API key
    console.log('\n1. Checking Gemini API configuration...');
    const geminiKey = process.env.GEMINI_API_KEY;
    console.log(`   Gemini API Key: ${geminiKey ? 'Present' : 'Missing'}`);
    console.log(`   Key length: ${geminiKey ? geminiKey.length : 0} characters`);
    
    // Test 2: Test Gemini API directly
    console.log('\n2. Testing Gemini API directly...');
    
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      
      const testPrompt = `You are a professional Hindi lyricist. Write ORIGINAL, modern Bollywood-style Hindi song lyrics.

USER REQUEST: "A beautiful love story between two people who meet during a festival"
STYLE: romantic, bollywood

IMPORTANT RULES:
1. Write ONLY Hindi lyrics - no English explanations
2. Use simple, commonly understood Hindi words
3. Include proper song structure with [Verse], [Chorus], [Bridge] tags
4. Make it romantic and festival-themed
5. NO explanations, translations, or additional text

Generate the modern Hindi lyrics now:`;
      
      console.log('   Sending test prompt to Gemini...');
      const result = await model.generateContent(testPrompt);
      const lyrics = result.response.text().trim();
      
      console.log('   ✅ Gemini API working');
      console.log(`   Generated lyrics length: ${lyrics.length} characters`);
      console.log(`   Contains Hindi text: ${/[\u0900-\u097F]/.test(lyrics) ? 'Yes' : 'No'}`);
      console.log(`   Has proper structure: ${lyrics.includes('[Verse]') || lyrics.includes('[Chorus]') ? 'Yes' : 'No'}`);
      console.log(`   Contains unwanted text: ${lyrics.includes('I hope') || lyrics.includes('These lyrics') || lyrics.includes('Translation') ? 'Yes' : 'No'}`);
      
      console.log('\n   First 300 characters of generated lyrics:');
      console.log(`   "${lyrics.substring(0, 300)}..."`);
      
    } catch (geminiError) {
      console.log('   ❌ Gemini API error:', geminiError.message);
      if (geminiError.message.includes('quota')) {
        console.log('   ⚠️  API quota exceeded - this could be the issue!');
      } else if (geminiError.message.includes('API_KEY')) {
        console.log('   ⚠️  API key issue - check your Gemini API key');
      }
    }
    
    // Test 3: Test the optimizeLyricsPrompt function
    console.log('\n3. Testing optimizeLyricsPrompt function...');
    
    try {
      const { optimizeLyricsPrompt } = require('../src/lib/gemini');
      
      const testLyrics = await optimizeLyricsPrompt(
        'A beautiful love story between two people who meet during a festival',
        ['romantic', 'bollywood'],
        [] // No reference lyrics for this test
      );
      
      console.log('   ✅ optimizeLyricsPrompt working');
      console.log(`   Generated lyrics length: ${testLyrics.length} characters`);
      console.log(`   Contains Hindi text: ${/[\u0900-\u097F]/.test(testLyrics) ? 'Yes' : 'No'}`);
      console.log(`   Has proper structure: ${testLyrics.includes('[Verse]') || testLyrics.includes('[Chorus]') ? 'Yes' : 'No'}`);
      
      console.log('\n   First 200 characters:');
      console.log(`   "${testLyrics.substring(0, 200)}..."`);
      
    } catch (optimizeError) {
      console.log('   ❌ optimizeLyricsPrompt error:', optimizeError.message);
    }
    
    // Test 4: Test the complete generateCompleteSong function
    console.log('\n4. Testing generateCompleteSong function...');
    
    try {
      const { generateCompleteSong } = require('../src/lib/ai-music');
      
      const result = await generateCompleteSong({
        title: 'Test Festival Love Song',
        theme: 'A beautiful love story between two people who meet during a colorful festival',
        styles: ['romantic', 'bollywood', 'traditional']
      });
      
      console.log('   ✅ generateCompleteSong working');
      console.log(`   Generated lyrics length: ${result.lyrics.length} characters`);
      console.log(`   Contains Hindi text: ${/[\u0900-\u097F]/.test(result.lyrics) ? 'Yes' : 'No'}`);
      console.log(`   Has proper structure: ${result.lyrics.includes('[Verse]') || result.lyrics.includes('[Chorus]') ? 'Yes' : 'No'}`);
      console.log(`   Reference songs: ${result.reference_songs ? result.reference_songs.length : 0}`);
      console.log(`   Task ID: ${result.task_id ? 'Present' : 'Missing'}`);
      
      console.log('\n   First 200 characters:');
      console.log(`   "${result.lyrics.substring(0, 200)}..."`);
      
      // Check if it's default/fallback lyrics
      if (result.lyrics.includes('Mock generated lyrics') || 
          result.lyrics.includes('Default lyrics') ||
          result.lyrics.length < 50) {
        console.log('   ⚠️  WARNING: This looks like default/fallback lyrics!');
      }
      
    } catch (completeError) {
      console.log('   ❌ generateCompleteSong error:', completeError.message);
    }
    
    // Test 5: Check recent songs in database
    console.log('\n5. Checking recent songs in database...');
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      
      const { data: recentSongs } = await supabase
        .from('songs')
        .select('id, title, lyrics, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (recentSongs && recentSongs.length > 0) {
        console.log(`   Found ${recentSongs.length} recent songs:`);
        
        recentSongs.forEach((song, index) => {
          console.log(`\n   Song ${index + 1}: ${song.title}`);
          console.log(`   Lyrics length: ${song.lyrics.length} characters`);
          console.log(`   Contains Hindi: ${/[\u0900-\u097F]/.test(song.lyrics) ? 'Yes' : 'No'}`);
          console.log(`   Has structure: ${song.lyrics.includes('[Verse]') || song.lyrics.includes('[Chorus]') ? 'Yes' : 'No'}`);
          console.log(`   First 100 chars: "${song.lyrics.substring(0, 100)}..."`);
          
          // Check for default lyrics patterns
          if (song.lyrics.includes('Mock generated lyrics') || 
              song.lyrics.includes('Default lyrics') ||
              song.lyrics.length < 50) {
            console.log('   ⚠️  WARNING: This looks like default/fallback lyrics!');
          }
        });
      } else {
        console.log('   No recent songs found');
      }
      
    } catch (dbError) {
      console.log('   ❌ Database check error:', dbError.message);
    }
    
    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('=====================================');
    console.log('If you see "default lyrics" or very short lyrics, the issue could be:');
    console.log('1. ❌ Gemini API quota exceeded');
    console.log('2. ❌ Gemini API key invalid or expired');
    console.log('3. ❌ Network connectivity issues');
    console.log('4. ❌ Error in lyrics generation logic');
    console.log('5. ❌ Fallback to mock/default lyrics due to API failures');
    
    console.log('\n💡 SOLUTIONS:');
    console.log('=====================================');
    console.log('1. Check Gemini API quota in Google AI Studio');
    console.log('2. Verify API key is correct and active');
    console.log('3. Check network connectivity');
    console.log('4. Look for error messages in the logs above');
    console.log('5. Try generating a new song to test current status');
    
  } catch (error) {
    console.error('💥 Debug lyrics generation failed:', error);
  }
}

debugLyricsGeneration();
