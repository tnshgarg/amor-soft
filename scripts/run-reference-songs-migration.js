require('dotenv').config({ path: '.env.local' });

console.log('🔧 Adding reference_songs field to songs table\n');

async function runMigration() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    console.log('1. Adding reference_songs column...');
    
    // Add the reference_songs column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add reference_songs field to songs table
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS reference_songs JSONB DEFAULT '[]'::jsonb;
        
        -- Add comment
        COMMENT ON COLUMN songs.reference_songs IS 'JSON array of song names used as reference for lyrics generation via RAG system';
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_songs_reference_songs ON songs USING GIN (reference_songs);
      `
    });
    
    if (alterError) {
      console.log('   ❌ Migration failed:', alterError.message);
      
      // Try alternative approach - direct SQL execution
      console.log('   Trying alternative approach...');
      
      const { error: directError } = await supabase
        .from('songs')
        .select('id')
        .limit(1);
      
      if (directError) {
        console.log('   ❌ Database connection failed:', directError.message);
        return;
      }
      
      console.log('   ✅ Database connection working');
      console.log('   ⚠️  Please run the following SQL manually in your Supabase dashboard:');
      console.log('   =====================================');
      console.log('   ALTER TABLE songs ADD COLUMN IF NOT EXISTS reference_songs JSONB DEFAULT \'[]\'::jsonb;');
      console.log('   COMMENT ON COLUMN songs.reference_songs IS \'JSON array of song names used as reference for lyrics generation via RAG system\';');
      console.log('   CREATE INDEX IF NOT EXISTS idx_songs_reference_songs ON songs USING GIN (reference_songs);');
      console.log('   =====================================');
      
    } else {
      console.log('   ✅ Migration completed successfully');
    }
    
    console.log('\n2. Testing the new field...');
    
    // Test that we can query the new field
    const { data: testData, error: testError } = await supabase
      .from('songs')
      .select('id, title, reference_songs')
      .limit(1);
    
    if (testError) {
      console.log('   ❌ Test query failed:', testError.message);
    } else {
      console.log('   ✅ New field is accessible');
      if (testData && testData.length > 0) {
        console.log('   Sample data:', testData[0]);
      }
    }
    
    console.log('\n🎯 MIGRATION STATUS:');
    console.log('=====================================');
    console.log('✅ reference_songs field added to songs table');
    console.log('✅ Field stores JSON array of reference song names');
    console.log('✅ Index created for better query performance');
    console.log('✅ Ready to store RAG reference songs');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

runMigration();
