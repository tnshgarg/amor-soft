"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { Music, Sparkles, Heart, Mic } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-8 text-center">
          {/* Hero Badge */}
          <Badge variant="secondary" className="px-4 py-2">
            <Sparkles className="mr-2 h-4 w-4" />
            AI-Powered Hindi Music Generation
          </Badge>

          {/* Hero Title */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Create Beautiful{" "}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Hindi Songs
              </span>{" "}
              with AI
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
              Transform your ideas into stunning Hindi music. Our AI understands
              your emotions and creates personalized songs with authentic lyrics
              and melodies.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <SignedIn>
              <Link href="/create">
                <Button size="lg" className="px-8">
                  <Music className="mr-2 h-5 w-5" />
                  Create Your Song
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/create">
                <Button size="lg" className="px-8">
                  <Music className="mr-2 h-5 w-5" />
                  Get Started Free
                </Button>
              </Link>
            </SignedOut>
            <Link href="/songs/1">
              <Button variant="outline" size="lg" className="px-8">
                <Heart className="mr-2 h-5 w-5" />
                Listen to Samples
              </Button>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-4xl">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  AI Lyrics Generation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Our AI creates authentic Hindi lyrics based on your emotions
                  and themes, drawing from thousands of classic songs.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Professional Music
                </h3>
                <p className="text-sm text-muted-foreground">
                  Generate high-quality music with various Hindi styles - from
                  classical to modern Bollywood beats.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Emotional Resonance
                </h3>
                <p className="text-sm text-muted-foreground">
                  Every song is crafted to capture the exact emotion and mood
                  you want to express, making it truly personal.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
