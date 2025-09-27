-- Add reference_songs field to songs table to store which songs were used as inspiration
-- This field will store a JSON array of song names that were used as reference for lyrics generation

-- Add the reference_songs column as JSONB to store array of song names
ALTER TABLE songs ADD COLUMN IF NOT EXISTS reference_songs JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the field
COMMENT ON COLUMN songs.reference_songs IS 'JSON array of song names used as reference for lyrics generation via RAG system';

-- Create an index for better performance when querying reference songs
CREATE INDEX IF NOT EXISTS idx_songs_reference_songs ON songs USING GIN (reference_songs);

-- Example of how the data will look:
-- reference_songs: ["Yeh Dosti", "I Am In Love", "Haan Jab Tak Hain Jaan"]
