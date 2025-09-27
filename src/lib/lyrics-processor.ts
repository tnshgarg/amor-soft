import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./gemini";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

export interface LyricsData {
  songTitle: string;
  hindiLyrics: string;
  englishTranslation: string;
}

export async function processLyricsCSV(csvPath: string) {
  try {
    const csvContent = fs.readFileSync(csvPath, "utf-8");

    const results = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const lyricsData: LyricsData[] = results.data.map((row: any) => ({
      songTitle: row["Song Title"] || "",
      hindiLyrics: row["Hindi Lyrics"] || "",
      englishTranslation: row["English Translations"] || "",
    }));

    console.log(`Processing ${lyricsData.length} songs...`);

    // Clear existing data first
    console.log("Clearing existing lyrics data...");
    const { error: clearError } = await supabaseAdmin
      .from("lyrics_index")
      .delete()
      .neq("id", 0); // Delete all rows

    if (clearError) {
      console.error("Error clearing existing data:", clearError);
    } else {
      console.log("✓ Cleared existing lyrics data");
    }

    let processed = 0;
    let skipped = 0;

    for (let i = 0; i < lyricsData.length; i++) {
      const song = lyricsData[i];

      if (!song.songTitle || !song.hindiLyrics) {
        skipped++;
        continue;
      }

      try {
        // Clean the Hindi lyrics - remove Python list format
        let cleanLyrics = song.hindiLyrics;

        // If it's a string representation of a Python list, parse it
        if (cleanLyrics.startsWith("['") && cleanLyrics.endsWith("']")) {
          try {
            // Convert Python list string to actual array
            const lyricsArray = JSON.parse(cleanLyrics.replace(/'/g, '"'));
            // Join the array elements, skip 'Lyrics' and numbers
            cleanLyrics = lyricsArray
              .filter(
                (line: string) => line !== "Lyrics" && !/^\d+$/.test(line)
              )
              .join("\n")
              .trim();
          } catch (parseError) {
            // If parsing fails, use original
            console.log(
              `Could not parse lyrics for ${song.songTitle}, using original`
            );
          }
        }

        if (!cleanLyrics || cleanLyrics.length < 10) {
          skipped++;
          continue;
        }

        // Generate embedding for the cleaned Hindi lyrics
        const embedding = await generateEmbedding(cleanLyrics);

        // Insert into lyrics_index table
        const { error } = await supabaseAdmin.from("lyrics_index").insert({
          song_name: song.songTitle,
          lyrics_text: cleanLyrics,
          embedding: embedding,
        });

        if (error) {
          console.error(`Error inserting song ${song.songTitle}:`, error);
          skipped++;
        } else {
          processed++;
          if (processed % 100 === 0) {
            console.log(`✓ Processed ${processed} songs...`);
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error processing song ${song.songTitle}:`, error);
        skipped++;
      }
    }

    console.log(`\n✅ Lyrics processing completed!`);
    console.log(`   Processed: ${processed} songs`);
    console.log(`   Skipped: ${skipped} songs`);
    console.log(`   Total: ${lyricsData.length} songs`);
  } catch (error) {
    console.error("Error processing lyrics CSV:", error);
    throw error;
  }
}

export async function findSimilarLyrics(
  queryText: string,
  matchCount: number = 5,
  matchThreshold: number = 0.01 // Very low threshold for better matches
): Promise<
  Array<{ song_name: string; lyrics_text: string; similarity?: number }>
> {
  try {
    console.log(`🔍 Finding similar lyrics for: "${queryText}"`);

    // Strategy 1: Try embedding similarity search
    try {
      const queryEmbedding = await generateEmbedding(queryText);

      const { data: embeddingResults, error: embeddingError } =
        await supabaseAdmin.rpc("match_lyrics", {
          query_embedding: queryEmbedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
        });

      if (!embeddingError && embeddingResults && embeddingResults.length > 0) {
        console.log(
          `✅ Found ${embeddingResults.length} songs via embedding similarity`
        );
        return embeddingResults.map((result: any) => ({
          song_name: result.song_name,
          lyrics_text: result.lyrics_text,
          similarity: result.similarity,
        }));
      }
    } catch (embeddingError) {
      console.log(`⚠️ Embedding search failed: ${embeddingError}`);
    }

    // Strategy 2: Text-based keyword search
    console.log(`🔍 Trying text-based keyword search...`);
    const keywords = queryText
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          ![
            "the",
            "and",
            "for",
            "are",
            "but",
            "not",
            "you",
            "all",
            "can",
            "had",
            "her",
            "was",
            "one",
            "our",
            "out",
            "day",
            "get",
            "has",
            "him",
            "his",
            "how",
            "its",
            "may",
            "new",
            "now",
            "old",
            "see",
            "two",
            "who",
            "boy",
            "did",
            "she",
            "use",
            "way",
            "who",
            "oil",
            "sit",
            "set",
          ].includes(word)
      );

    if (keywords.length > 0) {
      // Search for songs containing any of the keywords
      const searchConditions = keywords
        .map(
          (keyword) =>
            `song_name.ilike.%${keyword}%,lyrics_text.ilike.%${keyword}%`
        )
        .join(",");

      const { data: textResults, error: textError } = await supabaseAdmin
        .from("lyrics_index")
        .select("song_name, lyrics_text")
        .or(searchConditions)
        .limit(matchCount);

      if (!textError && textResults && textResults.length > 0) {
        console.log(
          `✅ Found ${
            textResults.length
          } songs via text search for keywords: ${keywords.join(", ")}`
        );
        return textResults.map((result) => ({
          song_name: result.song_name,
          lyrics_text: result.lyrics_text,
        }));
      }
    }

    // Strategy 3: Random popular songs fallback
    console.log(`🎲 Using random song fallback...`);
    const { data: randomResults, error: randomError } = await supabaseAdmin
      .from("lyrics_index")
      .select("song_name, lyrics_text")
      .limit(matchCount);

    if (!randomError && randomResults && randomResults.length > 0) {
      console.log(`✅ Using ${randomResults.length} random songs as fallback`);
      return randomResults.map((result) => ({
        song_name: result.song_name,
        lyrics_text: result.lyrics_text,
      }));
    }

    // Strategy 4: Hardcoded fallback for when database is empty
    console.log(`⚠️ Database appears empty, using hardcoded fallback`);
    return [
      {
        song_name: "Yeh Dosti",
        lyrics_text:
          "Yeh dosti hum nahin todhenge\nTodhenge dum magar\nTera saath na chhodenge",
      },
      {
        song_name: "Haan Jab Tak Hain Jaan",
        lyrics_text:
          "Haan jab tak hain jaan\nJaane jahaan main naachoongi\nPyar kabhi bhi marta nahin",
      },
      {
        song_name: "Koi Haseena",
        lyrics_text:
          "Koi haseena jab rooth jaati hain toh\nAur bhi haseen ho jaati hain",
      },
    ];
  } catch (error) {
    console.error("Error in findSimilarLyrics:", error);

    // Final fallback
    return [
      {
        song_name: "Classic Hindi Song",
        lyrics_text:
          "Dil mein basi hai teri yaad\nSapno mein aata hai tera chehra\nMohabbat ki yeh kahani",
      },
    ];
  }
}
