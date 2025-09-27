#!/usr/bin/env tsx

import { processLyricsCSV } from "../src/lib/lyrics-processor";
import path from "path";

async function main() {
  try {
    console.log("Starting lyrics processing...");

    const csvPath = path.join(process.cwd(), "lyrics_data.csv");
    await processLyricsCSV(csvPath);

    console.log("✅ Lyrics processing completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error processing lyrics:", error);
    process.exit(1);
  }
}

main();
