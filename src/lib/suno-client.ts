const SUNO_API_BASE = "https://api.sunoapi.com";

export interface SunoGenerateRequest {
  task_type: "create_music" | "persona_music";
  custom_mode: boolean;
  prompt: string;
  title: string;
  tags: string;
  mv: "chirp-v5";
  persona_id?: string;
}

export interface SunoGenerateResponse {
  message: string;
  task_id: string;
}

export interface SunoTaskResponse {
  code: number;
  data: Array<{
    clip_id: string;
    state: "pending" | "running" | "succeeded" | "failed";
    title: string;
    tags: string;
    lyrics: string;
    image_url: string;
    audio_url: string;
    video_url: string;
    created_at: string;
    mv: string;
    duration: number;
  }>;
  message: string;
}

export interface SunoLyricsRequest {
  description: string;
}

export interface SunoLyricsResponse {
  code: number;
  results: Array<{
    title: string;
    lyrics: string;
  }>;
  message: string;
}

class SunoClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: any
  ): Promise<T> {
    const url = `${SUNO_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Suno API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async generateLyrics(description: string): Promise<SunoLyricsResponse> {
    return this.makeRequest<SunoLyricsResponse>("/api/v1/suno/lyrics", "POST", {
      description,
    });
  }

  async generateMusic(
    request: SunoGenerateRequest
  ): Promise<SunoGenerateResponse> {
    return this.makeRequest<SunoGenerateResponse>(
      "/api/v1/suno/create",
      "POST",
      request
    );
  }

  async getTask(taskId: string): Promise<SunoTaskResponse> {
    return this.makeRequest<SunoTaskResponse>(`/api/v1/suno/task/${taskId}`);
  }

  async waitForCompletion(
    taskId: string,
    maxWaitTime: number = 300000, // 5 minutes
    pollInterval: number = 15000 // 15 seconds
  ): Promise<SunoTaskResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const response = await this.getTask(taskId);

      if (response.data && response.data.length > 0) {
        const firstClip = response.data[0];

        if (firstClip.state === "succeeded") {
          return response;
        }

        if (firstClip.state === "failed") {
          throw new Error("Music generation failed");
        }
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Music generation timed out");
  }
}

export const sunoClient = new SunoClient(process.env.SUNO_API_KEY!);
