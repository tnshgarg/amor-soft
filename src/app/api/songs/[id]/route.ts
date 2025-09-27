import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getSongById,
  updateSong,
  toggleSongLike,
  checkDatabaseSetup,
  supabaseAdmin,
} from "@/lib/supabase";

export async function GET(
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

    // Transform song for frontend
    const transformedSong = {
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
      duration: song.duration || 180,
      tags: song.tags
        ? song.tags.split(", ")
        : [song.genre, song.mood].filter(Boolean),
    };

    return NextResponse.json(transformedSong);
  } catch (error) {
    console.error("Error fetching song:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch song",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: songId } = await params;
    const body = await request.json();

    // Get the song first to check ownership
    const song = await getSongById(songId);
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Check if user owns this song
    if (song.clerk_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle like toggle specifically
    if ("liked" in body || "is_liked" in body) {
      const isLiked = body.liked ?? body.is_liked;
      const updatedSong = await toggleSongLike(songId, isLiked);
      return NextResponse.json({
        id: updatedSong.id,
        is_liked: updatedSong.is_liked,
        liked: updatedSong.is_liked,
      });
    }

    // Handle play count increment
    if ("increment_plays" in body) {
      const updatedSong = await updateSong(songId, {
        play_count: song.play_count + 1,
      });
      return NextResponse.json({
        id: updatedSong.id,
        play_count: updatedSong.play_count,
        plays: updatedSong.play_count,
      });
    }

    // Handle general updates
    const allowedUpdates = ["title", "theme", "genre", "mood", "lyrics"];
    const updates: any = {};

    for (const key of allowedUpdates) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    const updatedSong = await updateSong(songId, updates);
    return NextResponse.json(updatedSong);
  } catch (error) {
    console.error("Error updating song:", error);
    return NextResponse.json(
      {
        error: "Failed to update song",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: songId } = await params;

    // Get the song first to check ownership
    const song = await getSongById(songId);
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Check if user owns this song
    if (song.clerk_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the song (this will cascade to generation_logs due to foreign key)
    const { error } = await supabaseAdmin
      .from("songs")
      .delete()
      .eq("id", songId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Song deleted successfully" });
  } catch (error) {
    console.error("Error deleting song:", error);
    return NextResponse.json(
      {
        error: "Failed to delete song",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
