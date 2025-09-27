import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to check if database is properly set up
export async function checkDatabaseSetup(): Promise<{
  isSetup: boolean;
  error?: string;
}> {
  try {
    // Try to query users table
    const { error: usersError } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(1);

    if (usersError) {
      return {
        isSetup: false,
        error: `Database not set up: ${usersError.message}. Please run the SQL setup script.`,
      };
    }

    // Try to query songs table
    const { error: songsError } = await supabaseAdmin
      .from("songs")
      .select("id")
      .limit(1);

    if (songsError) {
      return {
        isSetup: false,
        error: `Songs table not found: ${songsError.message}. Please run the SQL setup script.`,
      };
    }

    return { isSetup: true };
  } catch (error) {
    return {
      isSetup: false,
      error: `Database connection failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

// Database types
export interface User {
  id: string;
  clerk_user_id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Song {
  id: string;
  user_id: string;
  clerk_user_id: string;
  title: string;
  theme?: string;
  genre?: string;
  mood?: string;
  duration?: number;
  task_id?: string;
  clip_id?: string;
  persona_id?: string;
  lyrics?: string;
  tags?: string;
  audio_url?: string;
  video_url?: string;
  image_url?: string;
  status: "pending" | "generating" | "completed" | "failed";
  error_message?: string;
  is_liked: boolean;
  play_count: number;
  reference_songs?: string[]; // Array of song names used as reference for lyrics generation
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface GenerationLog {
  id: string;
  song_id: string;
  step: string;
  request_data?: any;
  response_data?: any;
  status: "success" | "error";
  error_message?: string;
  created_at: string;
}

export interface Persona {
  id: string;
  user_id: string;
  suno_persona_id: string;
  name: string;
  description: string;
  source_clip_id?: string;
  is_default: boolean;
  created_at: string;
}

// Helper function to set user context for RLS
export async function setUserContext(clerkUserId: string) {
  const { error } = await supabase.rpc("set_config", {
    setting_name: "app.current_user_id",
    setting_value: clerkUserId,
    is_local: true,
  });

  if (error) {
    console.error("Error setting user context:", error);
  }
}

// User operations
export async function createOrUpdateUser(userData: {
  clerk_user_id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}) {
  try {
    // Check if database is set up first
    const dbCheck = await checkDatabaseSetup();
    if (!dbCheck.isSetup) {
      throw new Error(dbCheck.error || "Database not properly set up");
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert(userData, {
        onConflict: "clerk_user_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating/updating user:", error);
      throw error;
    }

    return data as User;
  } catch (error) {
    console.error("Error in createOrUpdateUser:", error);
    throw error;
  }
}

export async function getUserByClerkId(clerkUserId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (error && error.code !== "PGRST116") {
    // Not found error
    console.error("Error fetching user:", error);
    throw error;
  }

  return data as User | null;
}

// Song operations
export async function createSong(songData: {
  clerk_user_id: string;
  title: string;
  theme?: string;
  genre?: string;
  mood?: string;
  lyrics?: string;
}) {
  try {
    // Check if database is set up first
    const dbCheck = await checkDatabaseSetup();
    if (!dbCheck.isSetup) {
      throw new Error(dbCheck.error || "Database not properly set up");
    }

    // First ensure user exists
    const user = await getUserByClerkId(songData.clerk_user_id);
    if (!user) {
      throw new Error("User not found");
    }

    const { data, error } = await supabaseAdmin
      .from("songs")
      .insert({
        ...songData,
        user_id: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating song:", error);
      throw error;
    }

    return data as Song;
  } catch (error) {
    console.error("Error in createSong:", error);
    throw error;
  }
}

export async function updateSong(songId: string, updates: Partial<Song>) {
  const { data, error } = await supabaseAdmin
    .from("songs")
    .update(updates)
    .eq("id", songId)
    .select()
    .single();

  if (error) {
    console.error("Error updating song:", error);
    throw error;
  }

  return data as Song;
}

export async function getSongsByUser(clerkUserId: string) {
  const { data, error } = await supabaseAdmin
    .from("songs")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user songs:", error);
    throw error;
  }

  return data as Song[];
}

export async function incrementPlayCount(songId: string) {
  // First get current play count
  const { data: song, error: fetchError } = await supabaseAdmin
    .from("songs")
    .select("play_count")
    .eq("id", songId)
    .single();

  if (fetchError) {
    console.error("Error fetching song for play count:", fetchError);
    return;
  }

  // Increment and update
  const { error } = await supabaseAdmin
    .from("songs")
    .update({
      play_count: (song.play_count || 0) + 1,
    })
    .eq("id", songId);

  if (error) {
    console.error("Error incrementing play count:", error);
  }
}

export async function getSongsByUserId(clerkUserId: string): Promise<Song[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("songs")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching songs:", error);
      throw error;
    }

    return data as Song[];
  } catch (error) {
    console.error("Error in getSongsByUserId:", error);
    throw error;
  }
}

export async function getSongById(songId: string): Promise<Song | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("songs")
      .select("*")
      .eq("id", songId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error("Error fetching song by ID:", error);
      throw error;
    }

    return data as Song;
  } catch (error) {
    console.error("Error in getSongById:", error);
    throw error;
  }
}

export async function toggleSongLike(songId: string, isLiked: boolean) {
  const { data, error } = await supabaseAdmin
    .from("songs")
    .update({ is_liked: isLiked })
    .eq("id", songId)
    .select()
    .single();

  if (error) {
    console.error("Error toggling song like:", error);
    throw error;
  }

  return data as Song;
}

// Generation log operations
export async function createGenerationLog(logData: {
  song_id: string;
  step: string;
  request_data?: any;
  response_data?: any;
  status: "success" | "error";
  error_message?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("generation_logs")
    .insert(logData)
    .select()
    .single();

  if (error) {
    console.error("Error creating generation log:", error);
    throw error;
  }

  return data as GenerationLog;
}
