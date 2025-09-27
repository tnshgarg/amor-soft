require('dotenv').config({ path: '.env.local' });

console.log('🎵 Processing Small Batch of Lyrics for Testing\n');

async function processSmallBatch() {
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
    
    // Process only first 50 songs for testing
    const songsToProcess = results.data.slice(0, 50);
    console.log(`   Processing first ${songsToProcess.length} songs for testing...`);
    
    let processed = 0;
    let skipped = 0;
    
    for (let i = 0; i < songsToProcess.length; i++) {
      const row = songsToProcess[i];
      const songTitle = row["Song Title"] || "";
      const hindiLyrics = row["Hindi Lyrics"] || "";
      
      if (!songTitle || !hindiLyrics) {
        skipped++;
        continue;
      }
      
      try {
        // Clean the Hindi lyrics - remove Python list format
        let cleanLyrics = hindiLyrics;
        
        if (cleanLyrics.startsWith("['") && cleanLyrics.endsWith("']")) {
          try {
            const lyricsArray = JSON.parse(cleanLyrics.replace(/'/g, '"'));
            cleanLyrics = lyricsArray
              .filter(line => line !== 'Lyrics' && !/^\d+$/.test(line) && line.trim() !== '')
              .join('\n')
              .trim();
          } catch (parseError) {
            console.log(`   Could not parse lyrics for ${songTitle}, using original`);
          }
        }
        
        if (!cleanLyrics || cleanLyrics.length < 10) {
          skipped++;
          continue;
        }
        
        // Check if song already exists
        const { data: existing } = await supabase
          .from('lyrics_index')
          .select('id')
          .eq('song_name', songTitle)
          .single();
        
        if (existing) {
          console.log(`   ⏭️  Skipping ${songTitle} (already exists)`);
          skipped++;
          continue;
        }
        
        // Generate embedding
        const embedding = await embeddingModel.embedContent(cleanLyrics);
        
        // Insert into database
        const { error } = await supabase.from('lyrics_index').insert({
          song_name: songTitle,
          lyrics_text: cleanLyrics,
          embedding: embedding.embedding.values,
        });
        
        if (error) {
          console.error(`   ❌ Error inserting ${songTitle}:`, error.message);
          skipped++;
        } else {
          processed++;
          console.log(`   ✅ Processed: ${songTitle} (${processed}/${songsToProcess.length})`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${songTitle}:`, error.message);
        skipped++;
      }
    }
    
    console.log('\n🎯 BATCH PROCESSING COMPLETE:');
    console.log('=====================================');
    console.log(`✅ Processed: ${processed} songs`);
    console.log(`⏭️  Skipped: ${skipped} songs`);
    console.log(`📊 Total in batch: ${songsToProcess.length} songs`);
    
    // Test the RAG system with the new data
    console.log('\n🔍 Testing RAG System with New Data:');
    
    const testQueries = [
      'love story romantic',
      'friendship dosti',
      'festival celebration holi',
      'sad emotional breakup',
      'dance party celebration'
    ];
    
    for (const query of testQueries) {
      console.log(`\n   Testing query: "${query}"`);
      
      // Text search
      const { data: textResults } = await supabase
        .from('lyrics_index')
        .select('song_name')
        .or(`song_name.ilike.%${query.split(' ')[0]}%,lyrics_text.ilike.%${query.split(' ')[0]}%`)
        .limit(3);
      
      if (textResults && textResults.length > 0) {
        console.log(`   ✅ Found ${textResults.length} matches:`, textResults.map(r => r.song_name).join(', '));
      } else {
        console.log(`   ⚠️  No matches found for "${query}"`);
      }
    }
    
    // Check total count
    const { count } = await supabase
      .from('lyrics_index')
      .select('id', { count: 'exact' });
    
    console.log(`\n📊 Total songs in database: ${count}`);
    
    console.log('\n🚀 READY FOR TESTING:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Go to /create page');
    console.log('3. Test with themes like:');
    console.log('   - "A beautiful love story between two people"');
    console.log('   - "Friendship and loyalty between friends"');
    console.log('   - "Festival celebration with colors and joy"');
    console.log('4. Check that reference songs appear on song detail page');
    
  } catch (error) {
    console.error('💥 Batch processing failed:', error);
  }
}

processSmallBatch();
