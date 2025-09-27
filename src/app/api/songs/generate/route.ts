import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createSong,
  updateSong,
  createGenerationLog,
  createOrUpdateUser,
} from "@/lib/supabase";
import {
  generateCompleteSong,
  getHindiMusicStyle,
  safeApiCall,
} from "@/lib/ai-music";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { title, theme, styles, lyrics, duration } = body;

    // Validate required fields
    if (!title || !theme) {
      return NextResponse.json(
        { error: "Missing required fields: title, theme" },
        { status: 400 }
      );
    }

    // Parse styles from comma-separated string to array
    const stylesArray =
      typeof styles === "string"
        ? styles
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : Array.isArray(styles)
        ? styles
        : [];

    // Ensure user exists in database
    try {
      await createOrUpdateUser({ clerk_user_id: userId });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        {
          error: "Database not properly set up",
          message: "Please run the database setup script first",
          details:
            dbError instanceof Error
              ? dbError.message
              : "Unknown database error",
          setup_instructions: {
            step1: "Go to /api/database/status to check database status",
            step2:
              "Run the SQL script from scripts/simple-database-setup.sql in your Supabase dashboard",
            step3: "Try again after database setup is complete",
          },
        },
        { status: 503 }
      );
    }

    // Create song record
    const song = await createSong({
      clerk_user_id: userId,
      title,
      theme,
      genre: stylesArray.length > 0 ? stylesArray[0] : "bollywood", // Use first style as genre
      mood: "happy", // Default mood
      lyrics,
    });

    // Log the generation start (non-blocking)
    try {
      await createGenerationLog({
        song_id: song.id,
        step: "generation_started",
        request_data: { title, theme, styles: stylesArray, lyrics },
        status: "success",
      });
    } catch (logError) {
      console.error(
        "Failed to create generation log (non-critical):",
        logError
      );
      // Continue execution - logging failure shouldn't block song generation
    }

    // Start background generation process
    generateSongInBackground(song.id, {
      title,
      theme,
      styles: stylesArray,
      customLyrics: lyrics,
    });

    return NextResponse.json({
      success: true,
      song_id: song.id,
      message: "Song generation started",
    });
  } catch (error) {
    console.error("Error in song generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Background function to handle song generation
async function generateSongInBackground(
  songId: string,
  params: {
    title: string;
    theme: string;
    styles: string[];
    customLyrics?: string;
  }
) {
  try {
    // Update status to generating
    await updateSong(songId, { status: "generating" });

    // Generate the song
    const result = await safeApiCall(
      () =>
        generateCompleteSong({
          ...params,
          usePersona: false, // For now, we'll use basic generation
        }),
      "Song generation"
    );

    // Log successful generation start (non-blocking)
    try {
      await createGenerationLog({
        song_id: songId,
        step: "music_generation_started",
        request_data: params,
        response_data: { task_id: result.task_id },
        status: "success",
      });
    } catch (logError) {
      console.error("Failed to log generation start:", logError);
    }

    // Update song with task info and reference songs
    await updateSong(songId, {
      task_id: result.task_id,
      lyrics: result.lyrics,
      tags:
        params.styles.length > 0
          ? params.styles.join(", ")
          : "bollywood, hindi",
      title: result.title,
      reference_songs: result.reference_songs || [],
    });

    // Poll for completion in background
    pollSongCompletion(songId, result.task_id);
  } catch (error) {
    console.error("Error in background generation:", error);

    // Update song status to failed
    await updateSong(songId, {
      status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    // Log the error (non-blocking)
    try {
      await createGenerationLog({
        song_id: songId,
        step: "generation_failed",
        status: "error",
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Failed to log generation error:", logError);
    }
  }
}

// Function to poll for song completion
async function pollSongCompletion(songId: string, taskId: string) {
  try {
    const { pollTaskCompletion } = await import("@/lib/ai-music");

    // Poll for completion (max 15 attempts, 30s intervals = 7.5 minutes)
    // Using longer intervals due to API service issues
    const result = await pollTaskCompletion(taskId, 15, 30000);

    // Check if result.data exists and is valid
    if (!result.data || !Array.isArray(result.data)) {
      console.error(`Invalid task result for ${taskId}:`, result);

      // If it's a polling failure (code 500), mark as generating instead of failed
      if (result.code === 500 && result.message?.includes("Polling failed")) {
        console.log(
          `Marking song ${songId} as generating due to Suno API service issues`
        );
        await updateSong(songId, {
          status: "generating",
          error_message:
            "Song is being generated - Suno API experiencing temporary issues. Please check back later.",
        });

        // Log this for monitoring
        try {
          await createGenerationLog({
            song_id: songId,
            step: "polling_failed_api_issues",
            response_data: result,
            status: "error",
            error_message:
              "Suno API service issues during polling - song likely still generating",
          });
        } catch (logError) {
          console.error("Failed to log API issues:", logError);
        }
      } else {
        await updateSong(songId, {
          status: "failed",
          error_message: "Invalid response from Suno API",
        });
      }
      return;
    }

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
        error_message: null, // Clear any previous error message
      });

      // Log successful completion (non-blocking)
      try {
        await createGenerationLog({
          song_id: songId,
          step: "generation_completed",
          response_data: successfulClip,
          status: "success",
        });
      } catch (logError) {
        console.error("Failed to log completion:", logError);
      }
    } else {
      // Check if any failed
      const failedClip = result.data.find((clip) => clip.state === "failed");

      if (failedClip) {
        await updateSong(songId, {
          status: "failed",
          error_message: "Song generation failed on Suno API",
        });

        try {
          await createGenerationLog({
            song_id: songId,
            step: "generation_failed",
            response_data: result,
            status: "error",
            error_message: "Song generation failed on Suno API",
          });
        } catch (logError) {
          console.error("Failed to log generation failure:", logError);
        }
      } else {
        // Still pending/running - mark as timeout
        await updateSong(songId, {
          status: "failed",
          error_message: "Song generation timed out",
        });

        try {
          await createGenerationLog({
            song_id: songId,
            step: "generation_timeout",
            response_data: result,
            status: "error",
            error_message: "Song generation timed out after 5 minutes",
          });
        } catch (logError) {
          console.error("Failed to log timeout:", logError);
        }
      }
    }
  } catch (error) {
    console.error("Error polling song completion:", error);

    await updateSong(songId, {
      status: "failed",
      error_message: error instanceof Error ? error.message : "Polling error",
    });

    await createGenerationLog({
      song_id: songId,
      step: "polling_error",
      status: "error",
      error_message: error instanceof Error ? error.message : "Polling error",
    });
  }
}
