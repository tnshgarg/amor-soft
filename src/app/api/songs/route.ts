import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getSongsByUserId,
  createOrUpdateUser,
  checkDatabaseSetup,
} from "@/lib/supabase";

export async function GET(request: NextRequest) {
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
          setup_instructions: {
            step1: "Go to /api/database/status to check database status",
            step2:
              "Run the SQL script from scripts/fix-database-schema.sql in your Supabase dashboard",
            step3: "Try again after database setup is complete",
          },
        },
        { status: 503 }
      );
    }

    // Ensure user exists in database
    try {
      await createOrUpdateUser({ clerk_user_id: userId });
    } catch (userError) {
      console.error("Error creating/updating user:", userError);
      return NextResponse.json(
        {
          error: "Failed to create user record",
          details:
            userError instanceof Error ? userError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Get user's songs
    const songs = await getSongsByUserId(userId);

    // Transform songs for frontend
    const transformedSongs = songs.map((song) => ({
      id: song.id,
      title: song.title,
      theme: song.theme,
      genre: song.genre,
      mood: song.mood,
      lyrics: song.lyrics,
      status: song.status,
      audio_url: song.audio_url,
      video_url: song.video_url,
      image_url: song.image_url,
      is_liked: song.is_liked,
      play_count: song.play_count,
      created_at: song.created_at,
      updated_at: song.updated_at,
      completed_at: song.completed_at,
      error_message: song.error_message,
      // Add computed fields for frontend compatibility
      liked: song.is_liked,
      plays: song.play_count,
      duration: song.duration || 180, // Default 3 minutes if not set
      tags: song.tags
        ? song.tags.split(", ")
        : [song.genre, song.mood].filter(Boolean),
    }));

    return NextResponse.json(transformedSongs);
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch songs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // This endpoint is for creating songs, but we handle that in /api/songs/generate
    // This is just a placeholder for future direct song creation
    return NextResponse.json(
      { error: "Use /api/songs/generate for creating songs" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in songs POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
