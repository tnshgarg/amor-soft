import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getSongById,
  updateSong,
  createGenerationLog,
  checkDatabaseSetup,
} from "@/lib/supabase";
import { getTaskStatus } from "@/lib/ai-music";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: songId } = await params;
    const song = await getSongById(songId);

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Check if user owns this song
    if (song.clerk_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow retry for songs that are in generating status or have a task_id
    if (!song.task_id) {
      return NextResponse.json(
        { error: "Song has no task ID - cannot retry" },
        { status: 400 }
      );
    }

    if (song.status === "completed") {
      return NextResponse.json(
        { error: "Song is already completed" },
        { status: 400 }
      );
    }

    console.log(
      `Manual retry requested for song ${songId} with task ${song.task_id}`
    );

    // Try to get the current status from Suno API using direct fetch (more reliable)
    try {
      const response = await fetch(
        `https://api.sunoapi.com/api/v1/suno/task/${song.task_id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SUNO_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      let result;
      if (response.status === 202) {
        // Handle "not ready" response
        const notReadyResponse = await response.json();
        result = {
          code: 202,
          data: [],
          message: notReadyResponse.error || "Task not ready, please wait",
        };
      } else if (response.ok) {
        result = await response.json();
      } else {
        throw new Error(
          `Suno API error (${response.status}): ${await response.text()}`
        );
      }

      // Handle 202 "not ready" response
      if (result.code === 202) {
        await updateSong(songId, {
          status: "generating",
          error_message:
            "Song is still being generated. Please try again later.",
        });

        return NextResponse.json({
          success: true,
          status: "generating",
          message:
            "Song is still being generated. Please try again in a few minutes.",
        });
      }

      // Check if we have valid data
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        // Find the first successful clip
        const successfulClip = result.data.find(
          (clip) => clip.state === "succeeded"
        );

        if (successfulClip) {
          // Update song with successful result
          await updateSong(songId, {
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

          // Log successful completion
          try {
            await createGenerationLog({
              song_id: songId,
              step: "manual_retry_success",
              response_data: result,
              status: "success",
            });
          } catch (logError) {
            console.error("Failed to log manual retry success:", logError);
          }

          return NextResponse.json({
            success: true,
            status: "completed",
            message: "Song generation completed successfully!",
            audio_url: successfulClip.audio_url,
          });
        }

        // Check if any failed
        const failedClip = result.data.find((clip) => clip.state === "failed");
        if (failedClip) {
          await updateSong(songId, {
            status: "failed",
            error_message: "Song generation failed on Suno API",
          });

          return NextResponse.json({
            success: false,
            status: "failed",
            message: "Song generation failed. Please try creating a new song.",
          });
        }

        // Still pending/running
        await updateSong(songId, {
          status: "generating",
          error_message:
            "Song is still being generated. Please try again later.",
        });

        return NextResponse.json({
          success: true,
          status: "generating",
          message:
            "Song is still being generated. Please try again in a few minutes.",
        });
      } else {
        // Invalid or empty data
        await updateSong(songId, {
          status: "generating",
          error_message:
            "Unable to check song status due to API issues. Please try again later.",
        });

        return NextResponse.json({
          success: true,
          status: "generating",
          message:
            "Unable to check song status due to temporary API issues. Please try again later.",
        });
      }
    } catch (error) {
      console.error(`Manual retry failed for song ${songId}:`, error);

      // Log the retry attempt
      try {
        await createGenerationLog({
          song_id: songId,
          step: "manual_retry_failed",
          status: "error",
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        });
      } catch (logError) {
        console.error("Failed to log manual retry failure:", logError);
      }

      // Keep song in generating status for user to try again
      await updateSong(songId, {
        status: "generating",
        error_message:
          "Unable to check song status due to API issues. Please try again later.",
      });

      return NextResponse.json({
        success: false,
        status: "generating",
        message:
          "Unable to check song status due to temporary API issues. Please try again later.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error in manual retry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
