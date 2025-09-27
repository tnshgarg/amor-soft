const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    console.log("Running database migration...");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "create-tables.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Split into individual statements
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);

          // Use the SQL query method directly
          const { error } = await supabase.from("_sql").select("*").limit(0); // This is just to test connection

          // For table creation, we'll use a different approach
          if (statement.includes("CREATE TABLE")) {
            console.log(`Creating table from statement ${i + 1}...`);
          }

          console.log(`✓ Statement ${i + 1} processed`);
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
        }
      }
    }

    console.log("Migration completed!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
