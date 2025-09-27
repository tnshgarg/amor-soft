require('dotenv').config({ path: '.env.local' });

console.log('🎵 Processing FULL Lyrics Dataset (4230 songs)\n');

async function processFullDataset() {
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
    
    console.log('1. Reading full CSV file...');
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
    
    if (currentCount >= 4000) {
      console.log('✅ Database already has most songs, skipping full processing');
      console.log('   If you want to reprocess, delete existing data first');
      return;
    }
    
    console.log(`   Processing all ${results.data.length} songs...`);
    console.log('   ⚠️  This will take 2-3 hours due to API rate limits');
    console.log('   ⚠️  Press Ctrl+C to cancel if needed');
    
    // Wait 5 seconds for user to cancel if needed
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches to avoid memory issues
    const batchSize = 100;
    const totalBatches = Math.ceil(results.data.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, results.data.length);
      const batch = results.data.slice(startIndex, endIndex);
      
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${totalBatches} (songs ${startIndex + 1}-${endIndex})`);
      
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
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
              // Use original if parsing fails
            }
          }
          
          if (!cleanLyrics || cleanLyrics.length < 10) {
            skipped++;
            continue;
          }
          
          // Generate embedding with retry logic
          let embedding;
          let retries = 3;
          
          while (retries > 0) {
            try {
              const result = await embeddingModel.embedContent(cleanLyrics);
              embedding = result.embedding.values;
              break;
            } catch (embeddingError) {
              retries--;
              if (embeddingError.message.includes('quota') || embeddingError.message.includes('rate')) {
                console.log(`   ⏳ Rate limit hit, waiting 60 seconds... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, 60000));
              } else {
                throw embeddingError;
              }
            }
          }
          
          if (!embedding) {
            console.log(`   ❌ Failed to generate embedding for ${songTitle} after retries`);
            errors++;
            continue;
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
            if (processed % 50 === 0) {
              console.log(`   ✅ Processed ${processed} songs so far...`);
            }
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`   ❌ Error processing ${songTitle}:`, error.message);
          errors++;
        }
      }
      
      // Longer delay between batches
      if (batchIndex < totalBatches - 1) {
        console.log(`   ⏳ Batch complete, waiting 30 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    console.log('\n🎯 FULL DATASET PROCESSING COMPLETE:');
    console.log('=====================================');
    console.log(`✅ Processed: ${processed} songs`);
    console.log(`⏭️  Skipped: ${skipped} songs (already existed or invalid)`);
    console.log(`❌ Errors: ${errors} songs`);
    console.log(`📊 Total attempted: ${results.data.length} songs`);
    
    // Final count check
    const { count: finalCount } = await supabase
      .from('lyrics_index')
      .select('id', { count: 'exact' });
    
    console.log(`📊 Final database count: ${finalCount} songs`);
    
    console.log('\n🚀 RAG SYSTEM NOW READY WITH FULL DATASET!');
    console.log('The system can now find relevant songs from 4000+ Hindi songs');
    console.log('Test with various themes to see different reference songs');
    
  } catch (error) {
    console.error('💥 Full dataset processing failed:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  processFullDataset();
}

module.exports = { processFullDataset };
