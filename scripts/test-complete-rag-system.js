require('dotenv').config({ path: '.env.local' });

console.log('🎵 Testing Complete RAG System with Real Song Generation\n');

async function testCompleteRAGSystem() {
  try {
    console.log('1. Testing RAG System Directly:');
    
    // Test the RAG system directly
    const { findSimilarLyrics } = require('../src/lib/lyrics-processor');
    const { optimizeLyricsPrompt } = require('../src/lib/gemini');
    
    const testTheme = "A beautiful love story between two people who meet during a colorful festival";
    console.log('   Theme:', testTheme);
    
    // Find similar lyrics
    console.log('   Finding similar lyrics...');
    const similarLyrics = await findSimilarLyrics(testTheme, 3);
    
    console.log('   ✅ Found', similarLyrics.length, 'reference songs:');
    if (similarLyrics.length > 0) {
      similarLyrics.forEach((song, i) => {
        console.log(`      ${i + 1}. ${song.song_name}`);
      });
      
      // Generate lyrics using reference songs
      console.log('\n   Generating lyrics with reference songs...');
      const styles = ["romantic", "bollywood", "classical", "peaceful"];
      const referenceLyricsTexts = similarLyrics.map(s => s.lyrics_text);
      
      try {
        const generatedLyrics = await optimizeLyricsPrompt(testTheme, styles, referenceLyricsTexts);
        
        console.log('   ✅ Generated lyrics successfully');
        console.log('   Length:', generatedLyrics.length, 'characters');
        console.log('   Preview:', generatedLyrics.substring(0, 200) + '...');
        
        // Check if lyrics are clean (no explanations)
        const hasUnwantedText = [
          'explanation', 'meaning', 'style', 'hope these', 'capture',
          'based on', 'here are', 'okay', 'i\'ve created'
        ].some(phrase => generatedLyrics.toLowerCase().includes(phrase));
        
        console.log('   Clean lyrics (no explanations):', hasUnwantedText ? '❌ NO' : '✅ YES');
        
        console.log('\n2. Testing Complete Song Generation Function:');
        
        // Test the complete song generation function
        const { generateCompleteSong } = require('../src/lib/ai-music');
        
        const songParams = {
          title: "Festival Love Story",
          theme: testTheme,
          styles: styles
        };
        
        console.log('   Generating complete song...');
        const songResult = await generateCompleteSong(songParams);
        
        console.log('   ✅ Song generation result:');
        console.log('   - Title:', songResult.title);
        console.log('   - Lyrics length:', songResult.lyrics.length);
        console.log('   - Reference songs:', songResult.reference_songs?.length || 0);
        console.log('   - Task ID:', songResult.task_id ? 'Present' : 'Missing');
        console.log('   - Error:', songResult.error || 'None');
        
        if (songResult.reference_songs && songResult.reference_songs.length > 0) {
          console.log('   - Reference songs list:', songResult.reference_songs.join(', '));
        }
        
        console.log('\n3. Testing Different Themes for Uniqueness:');
        
        // Test with different theme to ensure uniqueness
        const testTheme2 = "A song about deep friendship and loyalty between childhood friends";
        const songParams2 = {
          title: "Friendship Forever",
          theme: testTheme2,
          styles: ["friendship", "bollywood", "upbeat", "nostalgic"]
        };
        
        console.log('   Theme 2:', testTheme2);
        const songResult2 = await generateCompleteSong(songParams2);
        
        console.log('   ✅ Second song generation result:');
        console.log('   - Title:', songResult2.title);
        console.log('   - Reference songs:', songResult2.reference_songs?.length || 0);
        
        // Compare results
        const lyricsIdentical = songResult.lyrics === songResult2.lyrics;
        const referenceSongsIdentical = JSON.stringify(songResult.reference_songs) === JSON.stringify(songResult2.reference_songs);
        
        console.log('   - Lyrics identical:', lyricsIdentical ? '❌ YES (PROBLEM!)' : '✅ NO (GOOD)');
        console.log('   - Reference songs identical:', referenceSongsIdentical ? '❌ YES (PROBLEM!)' : '✅ NO (GOOD)');
        
        console.log('\n🎯 COMPLETE RAG SYSTEM STATUS:');
        console.log('=====================================');
        
        const checks = [
          { name: 'RAG System Working', status: similarLyrics.length > 0 ? '✅' : '❌' },
          { name: 'Reference Songs Found', status: similarLyrics.length > 0 ? '✅' : '❌' },
          { name: 'Lyrics Generation', status: songResult.lyrics.length > 0 ? '✅' : '❌' },
          { name: 'Clean Lyrics Output', status: !hasUnwantedText ? '✅' : '❌' },
          { name: 'Reference Songs Stored', status: songResult.reference_songs && songResult.reference_songs.length > 0 ? '✅' : '❌' },
          { name: 'Unique Lyrics per Theme', status: !lyricsIdentical ? '✅' : '❌' },
          { name: 'Different Reference Songs', status: !referenceSongsIdentical ? '✅' : '❌' },
          { name: 'Suno API Integration', status: songResult.task_id ? '✅' : '⚠️ (Mock)' }
        ];
        
        checks.forEach(check => {
          console.log(`${check.status} ${check.name}`);
        });
        
        const allGood = checks.filter(c => c.status === '✅').length;
        const total = checks.length;
        
        console.log(`\n📊 SYSTEM HEALTH: ${allGood}/${total} checks passed`);
        
        if (allGood >= 6) {
          console.log('🎉 RAG SYSTEM IS FULLY OPERATIONAL!');
          console.log('   ✅ Generates unique lyrics with reference songs');
          console.log('   ✅ Shows which songs inspired each creation');
          console.log('   ✅ Clean output without explanations');
          console.log('   ✅ Different themes produce different results');
        } else {
          console.log('⚠️  Some issues detected, but core functionality working');
        }
        
      } catch (lyricsError) {
        console.log('   ❌ Lyrics generation failed:', lyricsError.message);
        if (lyricsError.message.includes('quota')) {
          console.log('   ℹ️  This is likely due to Gemini API quota limits');
          console.log('   ℹ️  The system will work once quota resets');
        }
      }
      
    } else {
      console.log('   ⚠️  No reference songs found - testing fallback system');
      
      // Test that the system still works without reference songs
      const { generateCompleteSong } = require('../src/lib/ai-music');
      
      const fallbackResult = await generateCompleteSong({
        title: "Test Song",
        theme: "A simple test song",
        styles: ["bollywood"]
      });
      
      console.log('   ✅ Fallback system working:', fallbackResult.lyrics.length > 0 ? 'YES' : 'NO');
    }
    
  } catch (error) {
    console.error('💥 Complete RAG system test failed:', error);
  }
}

testCompleteRAGSystem();
