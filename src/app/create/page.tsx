"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Music,
  Sparkles,
  Heart,
  Mic,
  Play,
  Download,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// Removed unused genre and mood constants since we're using free-form styles input

export default function CreateSong() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    theme: "",
    styles: "",
    lyrics: "",
    duration: "3-4",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedSong, setGeneratedSong] = useState<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.title || !formData.theme || !formData.styles.trim()) {
      toast({
        title: "Missing Information",
        description:
          "Please fill in title, theme, and styles before generating.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Start the generation process
      const response = await fetch("/api/songs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          theme: formData.theme,
          styles: formData.styles,
          lyrics: formData.lyrics,
          duration: formData.duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle database setup errors specifically
        if (response.status === 503 && data.setup_instructions) {
          toast({
            title: "Database Setup Required",
            description: "Your database needs to be configured first.",
            variant: "destructive",
          });

          // Redirect to setup page
          setTimeout(() => {
            window.location.href = "/setup";
          }, 2000);
          return;
        }

        throw new Error(
          data.details || data.error || "Failed to start song generation"
        );
      }

      // Show progress simulation while generation happens in background
      const steps = [
        { message: "Starting AI music generation...", progress: 20 },
        { message: "Analyzing your theme and mood...", progress: 40 },
        { message: "Generating Hindi lyrics...", progress: 60 },
        { message: "Creating musical composition...", progress: 80 },
        { message: "Processing with Suno AI...", progress: 100 },
      ];

      for (const step of steps) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setProgress(step.progress);
      }

      // Show success message
      toast({
        title: "Song Generation Started!",
        description:
          "Your song is being generated. You can check its progress in your dashboard.",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (error) {
      console.error("Error generating song:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to start song generation. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const isFormValid =
    formData.title && formData.theme && formData.styles.trim();

  if (generatedSong) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => setGeneratedSong(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Create Another
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Your Song is Ready!
              </h1>
              <p className="text-muted-foreground">
                Listen to your AI-generated Hindi song
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  {generatedSong.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-center h-32 mb-4">
                    <Button size="lg" className="rounded-full h-16 w-16">
                      <Play className="h-6 w-6" />
                    </Button>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Duration: {generatedSong.duration}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => {
                      toast({
                        title: "Download Started",
                        description: "Your song is being downloaded...",
                      });
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      toast({
                        title: "Song Saved",
                        description:
                          "Your song has been saved to your library!",
                      });
                    }}
                  >
                    <Heart className="h-4 w-4" />
                    Save to Library
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Generated Lyrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
                    {generatedSong.lyrics}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                View All Songs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create Your Hindi Song
            </h1>
            <p className="text-muted-foreground">
              Let AI transform your ideas into beautiful Hindi music
            </p>
          </div>
        </div>

        {isGenerating ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <Sparkles className="h-6 w-6 absolute top-3 left-3 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Creating Your Song...
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Our AI is composing your personalized Hindi song
                  </p>
                  <Progress
                    value={progress}
                    className="w-full max-w-md mx-auto"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {progress}% complete
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Song Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Song Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter your song title..."
                      value={formData.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="theme">Theme/Story</Label>
                    <Textarea
                      id="theme"
                      placeholder="Describe the theme, story, or message of your song..."
                      value={formData.theme}
                      onChange={(e) =>
                        handleInputChange("theme", e.target.value)
                      }
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="lyrics">Custom Lyrics (Optional)</Label>
                    <Textarea
                      id="lyrics"
                      placeholder="Add your own Hindi lyrics or let AI create them..."
                      value={formData.lyrics}
                      onChange={(e) =>
                        handleInputChange("lyrics", e.target.value)
                      }
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Style & Mood</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="styles">Song Styles</Label>
                    <Input
                      id="styles"
                      placeholder="e.g., romantic, bollywood, classical, peaceful, traditional"
                      value={formData.styles}
                      onChange={(e) =>
                        handleInputChange("styles", e.target.value)
                      }
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter multiple styles separated by commas
                    </p>
                    {formData.styles && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.styles.split(",").map((style, index) => (
                          <Badge key={index} variant="secondary">
                            {style.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Duration</Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) =>
                        handleInputChange("duration", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2-3">2-3 minutes</SelectItem>
                        <SelectItem value="3-4">3-4 minutes</SelectItem>
                        <SelectItem value="4-5">4-5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Title</Label>
                      <p className="text-lg font-semibold">
                        {formData.title || "Your Song Title"}
                      </p>
                    </div>

                    {formData.styles && (
                      <div>
                        <Label className="text-sm font-medium">Styles</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {formData.styles.split(",").map((style, index) => (
                            <Badge key={index} variant="secondary">
                              {style.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.theme && (
                      <div>
                        <Label className="text-sm font-medium">Theme</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formData.theme}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleGenerate}
                disabled={!isFormValid}
              >
                <Sparkles className="h-5 w-5" />
                Generate Song
              </Button>

              {!isFormValid && (
                <p className="text-sm text-muted-foreground text-center">
                  Please fill in the title, theme, and styles to generate your
                  song
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
