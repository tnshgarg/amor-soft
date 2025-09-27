import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseSetup, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check database setup
    const dbCheck = await checkDatabaseSetup();
    
    if (!dbCheck.isSetup) {
      return NextResponse.json({
        status: 'error',
        message: dbCheck.error,
        setup: false,
        instructions: {
          step1: 'Go to your Supabase dashboard SQL editor',
          step2: 'Copy and paste the SQL from scripts/simple-database-setup.sql',
          step3: 'Run the SQL script',
          step4: 'Refresh this endpoint to verify setup'
        }
      }, { status: 500 });
    }

    // Get table counts
    const tables = ['users', 'songs', 'generation_logs', 'personas'];
    const tableCounts: Record<string, number> = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          tableCounts[table] = -1; // Error
        } else {
          tableCounts[table] = count || 0;
        }
      } catch (err) {
        tableCounts[table] = -1;
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database is properly set up',
      setup: true,
      tables: tableCounts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database status check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      setup: false
    }, { status: 500 });
  }
}
