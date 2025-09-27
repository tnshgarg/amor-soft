"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database, 
  AlertTriangle,
  Copy,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

interface DatabaseStatus {
  status: 'success' | 'error';
  message: string;
  setup: boolean;
  tables?: Record<string, number>;
  instructions?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
  };
}

export default function SetupPage() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/database/status');
      const data = await response.json();
      setStatus(data);
      
      if (data.setup) {
        toast({
          title: "Database Ready!",
          description: "Your database is properly configured.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check database status.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const copySQL = () => {
    const sql = `-- AMOR Database Setup
-- Copy this entire script and run it in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS generation_logs CASCADE;
DROP TABLE IF EXISTS personas CASCADE;
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create songs table
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    theme TEXT,
    genre TEXT,
    mood TEXT,
    duration INTEGER,
    task_id TEXT,
    clip_id TEXT,
    persona_id TEXT,
    lyrics TEXT,
    tags TEXT,
    audio_url TEXT,
    video_url TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    error_message TEXT,
    is_liked BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create generation logs table
CREATE TABLE generation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personas table
CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    persona_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    voice_characteristics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_clerk_user_id ON songs(clerk_user_id);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX idx_generation_logs_song_id ON generation_logs(song_id);
CREATE INDEX idx_generation_logs_task_id ON generation_logs(task_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verification
SELECT 'Database setup completed successfully!' as message;`;

    navigator.clipboard.writeText(sql);
    toast({
      title: "SQL Copied!",
      description: "The setup script has been copied to your clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Amor Database Setup
          </h1>
          <p className="text-gray-600">
            Configure your database to start generating AI music
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Status
              <Button
                variant="outline"
                size="sm"
                onClick={checkStatus}
                disabled={loading}
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {status.setup ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <Badge variant={status.setup ? "default" : "destructive"}>
                    {status.setup ? "Ready" : "Setup Required"}
                  </Badge>
                  <span className="text-sm text-gray-600">{status.message}</span>
                </div>

                {status.tables && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {Object.entries(status.tables).map(([table, count]) => (
                      <div key={table} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-sm">{table}</div>
                        <div className={`text-lg font-bold ${count >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {count >= 0 ? count : 'Error'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600">Checking database status...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {status && !status.setup && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Your database needs to be set up before you can use Amor. Follow these steps:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium">Copy the SQL setup script</p>
                    <Button onClick={copySQL} variant="outline" size="sm" className="mt-2">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy SQL Script
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium">Open your Supabase SQL Editor</p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Supabase Dashboard
                      </a>
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                  <p className="font-medium">Paste and run the SQL script in the SQL Editor</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                  <p className="font-medium">Click "Refresh" above to verify the setup</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status && status.setup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Ready to Go!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Your database is properly configured. You can now start creating AI-generated Hindi music!
              </p>
              <div className="flex gap-4">
                <Button asChild>
                  <Link href="/create">
                    Start Creating Music
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">
                    View Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
