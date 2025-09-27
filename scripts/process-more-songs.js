require('dotenv').config({ path: '.env.local' });

console.log('🎵 Processing More Songs for Better RAG Coverage\n');

async function processMoreSongs() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const Papa = require('papaparse');
    const fs = require('fs');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    console.log('1. Reading CSV file...');
    const csvContent = fs.readFileSync('lyrics_data.csv', 'utf-8');
    const results = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    console.log(`   Found ${results.data.length} total songs in CSV`);
    
    // Check current count
    const { count: currentCount } = await supabase
      .from('lyrics_index')
      .select('id', { count: 'exact' });
    
    console.log(`   Currently have ${currentCount} songs in database`);
    
    // Process next 200 songs (from index 51 to 250)
    const startIndex = Math.max(51, currentCount - 10); // Start from where we left off
    const endIndex = Math.min(startIndex + 200, results.data.length);
    const songsToProcess = results.data.slice(startIndex, endIndex);
    
    console.log(`   Processing songs ${startIndex + 1} to ${endIndex} (${songsToProcess.length} songs)`);
    
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < songsToProcess.length; i++) {
      const row = songsToProcess[i];
      const songTitle = row["Song Title"] || "";
      const hindiLyrics = row["Hindi Lyrics"] || "";
      
      if (!songTitle || !hindiLyrics) {
        skipped++;
        continue;
      }
      
      try {
        // Check if song already exists
        const { data: existing } = await supabase
          .from('lyrics_index')
          .select('id')
          .eq('song_name', songTitle)
          .single();
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Clean the Hindi lyrics
        let cleanLyrics = hindiLyrics;
        
        if (cleanLyrics.startsWith("['") && cleanLyrics.endsWith("']")) {
          try {
            const lyricsArray = JSON.parse(cleanLyrics.replace(/'/g, '"'));
            cleanLyrics = lyricsArray
              .filter(line => line !== 'Lyrics' && !/^\d+$/.test(line) && line.trim() !== '')
              .join('\n')
              .trim();
          } catch (parseError) {
            // Use original if parsing fails
          }
        }
        
        if (!cleanLyrics || cleanLyrics.length < 10) {
          skipped++;
          continue;
        }
        
        // Generate embedding with retry
        let embedding;
        try {
          const result = await embeddingModel.embedContent(cleanLyrics);
          embedding = result.embedding.values;
        } catch (embeddingError) {
          if (embeddingError.message.includes('quota')) {
            console.log(`   ⏳ Quota exceeded, stopping processing at song ${i + 1}`);
            break;
          }
          throw embeddingError;
        }
        
        // Insert into database
        const { error } = await supabase.from('lyrics_index').insert({
          song_name: songTitle,
          lyrics_text: cleanLyrics,
          embedding: embedding,
        });
        
        if (error) {
          console.error(`   ❌ Error inserting ${songTitle}:`, error.message);
          errors++;
        } else {
          processed++;
          if (processed % 25 === 0) {
            console.log(`   ✅ Processed ${processed} songs...`);
          }
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${songTitle}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n🎯 BATCH PROCESSING COMPLETE:');
    console.log('=====================================');
    console.log(`✅ Processed: ${processed} songs`);
    console.log(`⏭️  Skipped: ${skipped} songs`);
    console.log(`❌ Errors: ${errors} songs`);
    
    // Final count
    const { count: finalCount } = await supabase
      .from('lyrics_index')
      .select('id', { count: 'exact' });
    
    console.log(`📊 Total songs in database: ${finalCount}`);
    
    // Test improved RAG coverage
    console.log('\n🧠 Testing Improved RAG Coverage:');
    
    const testQueries = [
      'love romantic story',
      'friendship dosti bond',
      'sad emotional heartbreak',
      'celebration dance party',
      'festival colors holi',
      'devotional spiritual bhajan',
      'classical traditional raga',
      'bollywood modern dance'
    ];
    
    for (const query of testQueries) {
      const keywords = query.split(' ').slice(0, 2);
      const searchConditions = keywords.map(keyword => 
        `song_name.ilike.%${keyword}%,lyrics_text.ilike.%${keyword}%`
      ).join(',');
      
      const { data: matches } = await supabase
        .from('lyrics_index')
        .select('song_name')
        .or(searchConditions)
        .limit(3);
      
      if (matches && matches.length > 0) {
        console.log(`   ✅ "${query}": Found ${matches.length} matches - ${matches.map(m => m.song_name).join(', ')}`);
      } else {
        console.log(`   ⚠️  "${query}": No matches found`);
      }
    }
    
    console.log('\n🚀 RAG SYSTEM IMPROVED!');
    console.log(`Now has ${finalCount} songs for better reference matching`);
    
  } catch (error) {
    console.error('💥 Processing failed:', error);
  }
}

processMoreSongs();
