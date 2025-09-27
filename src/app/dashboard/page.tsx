"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import {
  Music,
  Plus,
  Search,
  Play,
  Pause,
  Download,
  Share2,
  Trash2,
  Clock,
  Calendar,
  Heart,
  Loader2,
} from "lucide-react";
import Link from "next/link";

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
}

export default function Dashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalPlays: 0,
    favorites: 0,
    thisMonth: 0,
  });

  // Fetch songs on component mount
  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/songs");

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in to view your songs");
        } else if (response.status === 503) {
          const errorData = await response.json();
          setError(errorData.message || "Database setup required");
        } else {
          setError("Failed to fetch songs");
        }
        return;
      }

      const data = await response.json();
      setSongs(data);

      // Calculate stats
      const totalSongs = data.length;
      const totalPlays = data.reduce(
        (sum: number, song: Song) => sum + (song.play_count || 0),
        0
      );
      const favorites = data.filter((song: Song) => song.is_liked).length;
      const thisMonth = data.filter((song: Song) => {
        const songDate = new Date(song.created_at);
        const now = new Date();
        return (
          songDate.getMonth() === now.getMonth() &&
          songDate.getFullYear() === now.getFullYear()
        );
      }).length;

      setStats({ totalSongs, totalPlays, favorites, thisMonth });
    } catch (error) {
      console.error("Error fetching songs:", error);
      setError("Failed to load your songs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (song.genre &&
        song.genre.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (song.theme &&
        song.theme.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (song.mood && song.mood.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePlay = async (songId: string) => {
    const song = songs.find((s) => s.id === songId);
    if (!song?.audio_url) {
      toast({
        title: "No Audio Available",
        description:
          song?.status === "pending"
            ? "Song is still being generated"
            : "Audio not available for this song",
        variant: "destructive",
      });
      return;
    }

    // Navigate to song detail page for full playback experience
    window.location.href = `/songs/${songId}`;
  };

  const handleLike = async (songId: string) => {
    try {
      const song = songs.find((s) => s.id === songId);
      if (!song) return;

      const response = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: !song.is_liked }),
      });

      if (response.ok) {
        // Update local state
        setSongs((prev) =>
          prev.map((s) =>
            s.id === songId ? { ...s, is_liked: !s.is_liked } : s
          )
        );

        // Update stats
        setStats((prev) => ({
          ...prev,
          favorites: prev.favorites + (song.is_liked ? -1 : 1),
        }));
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

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch("/api/songs/check-status", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to check song status");
      }

      const result = await response.json();

      toast({
        title: "Status Check Complete",
        description: `Checked ${result.total} songs, updated ${result.updated} songs`,
      });

      // Refresh the songs list if any were updated
      if (result.updated > 0) {
        await fetchSongs();
      }
    } catch (error) {
      console.error("Error checking status:", error);
      toast({
        title: "Status Check Failed",
        description: "Failed to check song status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary">Generating...</Badge>;
      case "generating":
        return <Badge variant="secondary">Generating...</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading your songs..." />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Dashboard
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={fetchSongs} variant="outline">
                  Try Again
                </Button>
                {error.includes("sign in") && (
                  <Link href="/sign-in">
                    <Button>Sign In</Button>
                  </Link>
                )}
                {error.includes("Database") && (
                  <Link href="/setup">
                    <Button>Setup Database</Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Songs</h1>
            <p className="text-muted-foreground">
              Manage and listen to your AI-generated Hindi songs
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {checkingStatus ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              {checkingStatus ? "Checking..." : "Check Status"}
            </Button>
            <Link href="/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create New Song
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSongs}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPlays}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorites</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.favorites}</div>
              <p className="text-xs text-muted-foreground">Songs you loved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">New songs created</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search songs by title or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Songs List */}
        <div className="space-y-4">
          {filteredSongs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Music className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No songs found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Create your first AI-generated Hindi song to get started"}
                </p>
                <Link href="/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Song
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredSongs.map((song) => (
              <Card key={song.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePlay(song.id)}
                        disabled={song.status === "pending" || !song.audio_url}
                      >
                        {song.status === "pending" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/songs/${song.id}`}>
                            <h3 className="font-semibold hover:text-primary cursor-pointer transition-colors">
                              {song.title}
                            </h3>
                          </Link>
                          {getStatusBadge(song.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {song.genre && <span>{song.genre}</span>}
                          {song.mood && <span>• {song.mood}</span>}
                          {song.theme && <span>• {song.theme}</span>}
                          <span>• {formatTime(song.duration || 180)}</span>
                          <span>
                            • {new Date(song.created_at).toLocaleDateString()}
                          </span>
                          <span>• {song.play_count || 0} plays</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLike(song.id)}
                        className={song.is_liked ? "text-red-500" : ""}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            song.is_liked ? "fill-current" : ""
                          }`}
                        />
                      </Button>

                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>

                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
