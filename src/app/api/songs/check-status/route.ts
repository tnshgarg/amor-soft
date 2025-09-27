import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateSong, checkDatabaseSetup, supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check database setup
    const dbCheck = await checkDatabaseSetup();
    if (!dbCheck.isSetup) {
      return NextResponse.json(
        {
          error: "Database not properly set up",
          message: "Please run the database setup script first",
          details: dbCheck.error,
        },
        { status: 503 }
      );
    }

    // Get all songs that are stuck in generating status for this user
    const { data: stuckSongs, error: fetchError } = await supabaseAdmin
      .from("songs")
      .select("*")
      .eq("clerk_user_id", userId)
      .in("status", ["generating", "pending"])
      .not("task_id", "is", null)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching stuck songs:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch songs" },
        { status: 500 }
      );
    }

    if (!stuckSongs || stuckSongs.length === 0) {
      return NextResponse.json({
        message: "No songs need status checking",
        updated: 0,
      });
    }

    console.log(`Checking status for ${stuckSongs.length} songs...`);

    let updatedCount = 0;
    const results = [];

    // Check each song's status
    for (const song of stuckSongs) {
      try {
        console.log(`Checking song: ${song.title} (${song.task_id})`);

        // Direct API call to Suno
        const response = await fetch(
          `https://api.sunoapi.com/api/v1/suno/task/${song.task_id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 202) {
          // Still not ready
          console.log(`Song ${song.title} still processing...`);
          results.push({
            songId: song.id,
            title: song.title,
            status: "still_processing",
          });
          continue;
        }

        if (!response.ok) {
          console.log(`API error for song ${song.title}: ${response.status}`);
          results.push({
            songId: song.id,
            title: song.title,
            status: "api_error",
            error: `API returned ${response.status}`,
          });
          continue;
        }

        const result = await response.json();

        if (
          result.data &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          // Find the first successful clip
          const successfulClip = result.data.find(
            (clip) => clip.state === "succeeded"
          );

          if (successfulClip) {
            // Update song with successful result
            await updateSong(song.id, {
              status: "completed",
              clip_id: successfulClip.clip_id,
              audio_url: successfulClip.audio_url,
              video_url: successfulClip.video_url,
              image_url: successfulClip.image_url,
              duration: successfulClip.duration
                ? Math.round(parseFloat(successfulClip.duration))
                : null,
              completed_at: new Date().toISOString(),
              error_message: null,
            });

            updatedCount++;
            console.log(`✅ Updated song: ${song.title}`);
            results.push({
              songId: song.id,
              title: song.title,
              status: "completed",
              audio_url: successfulClip.audio_url,
            });
            continue;
          }

          // Check if any failed
          const failedClip = result.data.find(
            (clip) => clip.state === "failed"
          );
          if (failedClip) {
            await updateSong(song.id, {
              status: "failed",
              error_message: "Song generation failed on Suno API",
            });

            console.log(`❌ Song failed: ${song.title}`);
            results.push({
              songId: song.id,
              title: song.title,
              status: "failed",
            });
            continue;
          }

          // Still pending/running
          console.log(`Song ${song.title} still in progress...`);
          results.push({
            songId: song.id,
            title: song.title,
            status: "in_progress",
          });
        } else {
          console.log(`Invalid data for song ${song.title}`);
          results.push({
            songId: song.id,
            title: song.title,
            status: "invalid_data",
          });
        }
      } catch (error) {
        console.error(`Error checking song ${song.title}:`, error);
        results.push({
          songId: song.id,
          title: song.title,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: `Checked ${stuckSongs.length} songs, updated ${updatedCount}`,
      updated: updatedCount,
      total: stuckSongs.length,
      results,
    });
  } catch (error) {
    console.error("Error in status check:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
