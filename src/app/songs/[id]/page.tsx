"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import {
  Play,
  Pause,
  Download,
  Share2,
  Heart,
  ArrowLeft,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Clock,
  Calendar,
  User,
  Music,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Song {
  id: string;
  title: string;
  theme?: string;
  genre?: string;
  mood?: string;
  lyrics?: string;
  status: string;
  audio_url?: string;
  video_url?: string;
  image_url?: string;
  is_liked: boolean;
  play_count: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
  duration?: number;
  tags?: string[];
  reference_songs?: string[]; // Array of song names used as reference for lyrics generation
}

export default function SongDetailPage() {
  const params = useParams();
  const songId = params.id as string;
  const { toast } = useToast();

  // State management
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeated, setIsRepeated] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  // Audio ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch song data
  const fetchSong = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/songs/${songId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Song not found");
        } else if (response.status === 401) {
          setError("Please sign in to view this song");
        } else {
          setError("Failed to load song");
        }
        return;
      }

      const songData = await response.json();
      setSong(songData);
      setIsLiked(songData.is_liked);

      // If song has audio URL, set up audio element
      if (songData.audio_url && audioRef.current) {
        console.log("🎵 Setting audio source:", songData.audio_url);
        audioRef.current.src = songData.audio_url;
        audioRef.current.load(); // Force reload of audio element
      }
    } catch (err) {
      console.error("Error fetching song:", err);
      setError("Failed to load song");
    } finally {
      setLoading(false);
    }
  };

  // Load song data on mount and set up polling for generating songs
  useEffect(() => {
    if (songId) {
      fetchSong();
    }
  }, [songId]);

  // Polling effect for songs that are still generating
  useEffect(() => {
    if (!song) return;

    // Only poll if song is in generating or pending state
    if (song.status === "generating" || song.status === "pending") {
      console.log(
        `🔄 Setting up polling for song ${song.id} (status: ${song.status})`
      );

      const pollInterval = setInterval(async () => {
        console.log(`🔄 Polling song ${song.id} status...`);
        try {
          const response = await fetch(`/api/songs/${songId}`);
          if (response.ok) {
            const updatedSong = await response.json();
            if (updatedSong.status !== song.status) {
              console.log(
                `✅ Song status changed: ${song.status} → ${updatedSong.status}`
              );
              await fetchSong(); // Refresh the full song data
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 10000); // Poll every 10 seconds

      // Clear interval when component unmounts or song status changes
      return () => {
        console.log(`🛑 Clearing polling for song ${song.id}`);
        clearInterval(pollInterval);
      };
    }
  }, [song?.status, song?.id, songId]);

  const progressRef = useRef<HTMLDivElement>(null);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song?.audio_url) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if (isRepeated) {
        audio.currentTime = 0;
        audio.play();
        setIsPlaying(true);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [song, isRepeated]);

  // Audio player controls
  const togglePlayPause = async () => {
    const audio = audioRef.current;

    console.log("🎵 togglePlayPause called", {
      hasAudio: !!audio,
      hasAudioUrl: !!song?.audio_url,
      audioUrl: song?.audio_url,
      songStatus: song?.status,
      audioReadyState: audio?.readyState,
      audioNetworkState: audio?.networkState,
    });

    if (!audio || !song?.audio_url) {
      console.log("❌ No audio or audio URL available");
      toast({
        title: "No Audio Available",
        description:
          song?.status === "pending" || song?.status === "generating"
            ? "Song is still being generated"
            : "Audio not available for this song",
        variant: "destructive",
      });
      return;
    }

    // Check if audio URL is valid (not a mock URL)
    if (
      song.audio_url.includes("mock-audio-url") ||
      song.audio_url.includes("example.com")
    ) {
      console.log("⚠️ Mock audio URL detected");
      toast({
        title: "Demo Audio",
        description:
          "This is a demo song. Real audio generation is in progress.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isPlaying) {
        console.log("⏸️ Pausing audio");
        audio.pause();
        setIsPlaying(false);
      } else {
        console.log("▶️ Attempting to play audio");
        console.log("Audio ready state:", audio.readyState);
        console.log("Audio network state:", audio.networkState);

        // Simple audio loading - let the browser handle it
        console.log("🔄 Ensuring audio is loaded...");
        if (audio.src !== song.audio_url) {
          audio.src = song.audio_url;
          audio.load();
        }

        console.log("🎵 Attempting to play audio...");

        // Simple play attempt
        await audio.play();
        setIsPlaying(true);
        console.log("✅ Audio playing successfully");

        // Increment play count
        fetch(`/api/songs/${songId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ increment_plays: true }),
        }).catch(console.error);
      }
    } catch (error) {
      console.error("❌ Error playing audio:", error);

      // Simple, user-friendly error message
      const errorMessage =
        error instanceof Error && error.message.includes("play()")
          ? "Audio playback was interrupted. Please try clicking play again."
          : "Unable to play audio. Please check your internet connection and try again.";

      toast({
        title: "Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    setVolume(newVolume);
    audio.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: !isLiked }),
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        setSong((prev) => (prev ? { ...prev, is_liked: !isLiked } : null));
        toast({
          title: isLiked ? "Removed from favorites" : "Added to favorites",
          description: isLiked
            ? "Song removed from your favorites"
            : "Song added to your favorites",
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!song?.audio_url) {
      toast({
        title: "Download Not Available",
        description:
          song?.status === "pending" || song?.status === "generating"
            ? "Song is still being generated"
            : "Audio not available for download",
        variant: "destructive",
      });
      return;
    }

    try {
      setDownloadLoading(true);

      // Fetch the audio file
      const response = await fetch(song.audio_url);
      if (!response.ok) throw new Error("Failed to fetch audio");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song.title || "song"}.mp3`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "Your song is being downloaded",
      });
    } catch (error) {
      console.error("Error downloading song:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download the song. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!song?.id) return;

    setRetryLoading(true);
    try {
      const response = await fetch(`/api/songs/${song.id}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to retry song generation");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Status Updated",
          description: result.message,
        });

        // Refresh the song data
        await fetchSong();
      } else {
        toast({
          title: "Retry Failed",
          description: result.message || "Failed to check song status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Retry failed:", error);
      toast({
        title: "Retry Failed",
        description: "Failed to check song status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRetryLoading(false);
    }
  };

  // Utility functions
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading song details..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Song</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={fetchSong} variant="outline">
                  Try Again
                </Button>
                <Link href="/dashboard">
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Song not found state
  if (!song) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Song Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The song you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/dashboard">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
        controls={false}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            console.log(
              "✅ Audio metadata loaded, duration:",
              audioRef.current.duration
            );
          }
        }}
        onCanPlay={() => {
          console.log("✅ Audio can play");
        }}
        onError={(e) => {
          console.error("❌ Audio error:", e);
          const audio = e.target as HTMLAudioElement;
          console.error("Audio error details:", {
            error: audio.error,
            networkState: audio.networkState,
            readyState: audio.readyState,
            src: audio.src,
          });
          toast({
            title: "Audio Error",
            description:
              "Failed to load audio file. The file may be corrupted or unavailable.",
            variant: "destructive",
          });
        }}
        onLoadStart={() => {
          console.log("🔄 Audio load started");
        }}
        onLoadedData={() => {
          console.log("✅ Audio data loaded");
        }}
      />

      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={isLiked ? "text-red-500" : ""}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Song Header */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-bold mb-2">{song.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">AI Generated</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
                {song.genre && <Badge variant="secondary">{song.genre}</Badge>}
                {song.mood && <Badge variant="outline">{song.mood}</Badge>}
                <Badge
                  variant={
                    song.status === "completed" ? "default" : "secondary"
                  }
                >
                  {song.status}
                </Badge>
              </div>

              {/* Theme Description */}
              {song.theme && (
                <div className="bg-secondary/20 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Song Theme
                  </h3>
                  <p className="text-sm leading-relaxed">{song.theme}</p>
                </div>
              )}
            </div>

            {/* Live Status Indicator */}
            {(song.status === "generating" || song.status === "pending") && (
              <Card className="border-orange-200 bg-white dark:bg-orange-950/20">
                <CardContent className="p-4 bg-white">
                  <div className="flex items-center gap-3 ">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        {song.status === "generating"
                          ? "Generating Song..."
                          : "Queued for Generation"}
                      </span>
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">
                      This may take 2-3 minutes
                    </div>
                  </div>
                  {song.task_id && (
                    <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                      Task ID: {song.task_id.substring(0, 20)}...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {song.status === "completed" && song.audio_url && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Song Ready to Play
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {song.status === "failed" && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      Generation Failed
                    </span>
                  </div>
                  {song.error_message && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      {song.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Audio Player */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div
                      ref={progressRef}
                      className="w-full h-2 bg-secondary rounded-full cursor-pointer"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-100"
                        style={{
                          width:
                            duration > 0
                              ? `${(currentTime / duration) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsShuffled(!isShuffled)}
                      className={isShuffled ? "text-primary" : ""}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>

                    <Button variant="ghost" size="sm">
                      <SkipBack className="h-4 w-4" />
                    </Button>

                    <Button
                      size="lg"
                      onClick={togglePlayPause}
                      disabled={!song.audio_url}
                      className="h-12 w-12 rounded-full"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6 ml-1" />
                      )}
                    </Button>

                    <Button variant="ghost" size="sm">
                      <SkipForward className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRepeated(!isRepeated)}
                      className={isRepeated ? "text-primary" : ""}
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center justify-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={toggleMute}>
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) =>
                        handleVolumeChange(parseFloat(e.target.value))
                      }
                      className="w-24 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Status Messages */}
                  {(song.status === "pending" ||
                    song.status === "generating") && (
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        {song.status === "generating"
                          ? "Song is being generated. This may take a few minutes due to API processing."
                          : "Song is still being generated. Please check back in a few minutes."}
                      </p>
                      {song.error_message && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">
                          {song.error_message}
                        </p>
                      )}
                      {song.status === "generating" && (
                        <Button
                          onClick={handleRetry}
                          disabled={retryLoading}
                          size="sm"
                          variant="outline"
                          className="bg-white/50 hover:bg-white/70"
                        >
                          {retryLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Checking...
                            </>
                          ) : (
                            "Check Status"
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {song.status === "failed" && (
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Song generation failed. {song.error_message}
                      </p>
                    </div>
                  )}

                  {!song.audio_url && song.status === "completed" && (
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Audio not available for this song.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Button
                onClick={handleDownload}
                disabled={!song.audio_url || downloadLoading}
                className="flex-1 sm:flex-none"
              >
                {downloadLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>

              <Button variant="outline" className="flex-1 sm:flex-none">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Song Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Song Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plays</span>
                  <span className="font-medium">{song.play_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Duration
                  </span>
                  <span className="font-medium">
                    {song.duration
                      ? formatTime(song.duration)
                      : formatTime(duration)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(song.created_at).toLocaleDateString()}
                  </span>
                </div>
                {song.completed_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Completed
                    </span>
                    <span className="font-medium">
                      {new Date(song.completed_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lyrics */}
            {song.lyrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lyrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {song.lyrics}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {song.tags && song.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {song.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reference Songs */}
            {song.reference_songs && song.reference_songs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Reference Songs
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    These songs inspired the lyrics generation
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {song.reference_songs.map((songName, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                      >
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Music className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{songName}</p>
                          <p className="text-xs text-muted-foreground">
                            Classic Hindi Song
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
