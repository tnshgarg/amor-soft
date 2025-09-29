import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

export async function optimizeLyricsPrompt(
  userPrompt: string,
  styleTags: string[],
  similarLyrics: string[]
): Promise<string> {
  const prompt = `You are a professional Hindi lyricist. Write ORIGINAL, modern Bollywood-style Hindi song lyrics based on the user's request.

USER REQUEST: "${userPrompt}"
STYLE: ${styleTags.join(", ")}

${
  similarLyrics.length > 0
    ? `REFERENCE SONGS FOR INSPIRATION:
${similarLyrics
  .map((lyrics, i) => `${i + 1}. ${lyrics.substring(0, 200)}...`)
  .join("\n\n")}

Use these only for emotion, vibe, and flow. Do NOT copy rare, complex, or niche words; replace them with simple, melodic Hindi or minor English words.`
    : ""
}

STRICT REQUIREMENTS:
- Output ONLY Hindi song lyrics (Hinglish words allowed sparingly for natural modern feel)
- Avoid very heavy, old-fashioned, or niche Hindi words and cultural references
- Avoid slang, internet memes, or uncommon English words that are hard to pronounce
- Lyrics must be easy to sing with smooth, melodic flow
- Short to medium-length phrases; natural rhythm for modern Bollywood songs
- Modern, youthful, romantic Hindi with memorable rhymes and emotional impact
- Minor English words (like "love", "baby", "forever") are okay, max 1–2 per line
- Song structure: [Verse], [Chorus], [Verse 2], [Chorus], [Bridge], [Outro]
- Verses: 4–6 lines, Chorus: 4 lines
- Maintain emotional depth and connection, with hooks that feel natural in singing

OUTPUT FORMAT:
[Verse]
Lyrics here...

[Chorus]
Lyrics here...

[Verse 2]
Lyrics here...

[Chorus]
Lyrics here...

[Bridge]
Lyrics here...

[Outro]
Lyrics here...

Generate the modern Hindi lyrics now:`;

  try {
    const result = await geminiModel.generateContent(prompt);
    let lyrics = result.response.text().trim();

    // Clean the response to ensure only lyrics
    lyrics = cleanLyricsResponse(lyrics);

    return lyrics;
  } catch (error) {
    console.error("Error optimizing lyrics prompt:", error);
    throw error;
  }
}

// Function to clean unwanted text from lyrics response
function cleanLyricsResponse(lyrics: string): string {
  let cleaned = lyrics.trim();

  // Find the start of actual lyrics (first [Section] tag)
  const lyricsStart = cleaned.search(/\[(Verse|Chorus|Bridge|Intro|Outro)/i);
  if (lyricsStart !== -1) {
    cleaned = cleaned.substring(lyricsStart);
  }

  // Remove common unwanted suffixes
  const unwantedPatterns = [
    /\*\*[^*]*\*\*/g, // Bold text
    /\*[^*]*\*/g, // Italic text
    /I hope these lyrics[^]*$/i,
    /These lyrics capture[^]*$/i,
    /The song[^]*$/i,
    /Style Elements:[^]*$/i,
    /Explanation[^]*$/i,
    /Translation[^]*$/i,
    /Meaning[^]*$/i,
    /Note:[^]*$/i,
    /Here are[^]*$/i,
    /This song[^]*$/i,
  ];

  for (const pattern of unwantedPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove any trailing explanatory text after the last verse/chorus/bridge/outro
  const lastSectionMatch = cleaned.match(
    /(\[(?:Verse|Chorus|Bridge|Outro)[^\]]*\][^]*?)(?:\n\n[A-Z]|$)/i
  );
  if (lastSectionMatch) {
    const lastSectionEnd =
      cleaned.lastIndexOf(lastSectionMatch[1]) + lastSectionMatch[1].length;
    cleaned = cleaned.substring(0, lastSectionEnd);
  }

  return cleaned.trim();
}
