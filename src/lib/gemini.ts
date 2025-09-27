import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
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
  const prompt = `You are a professional Hindi lyricist. Create ONLY Hindi song lyrics based on the user's request.

USER REQUEST: "${userPrompt}"
STYLE: ${styleTags.join(", ")}

${
  similarLyrics.length > 0
    ? `REFERENCE SONGS FOR INSPIRATION:
${similarLyrics
  .map((lyrics, i) => `${i + 1}. ${lyrics.substring(0, 200)}...`)
  .join("\n\n")}

Use these as inspiration for style and emotion, but create completely original lyrics.`
    : ""
}

STRICT REQUIREMENTS:
- Output ONLY Hindi lyrics, nothing else
- No explanations, translations, or commentary
- No English words except in [Section] labels
- Use proper song structure: [Verse], [Chorus], [Bridge], [Outro]
- Make it authentic Bollywood style
- Keep verses 4-6 lines, chorus 4 lines
- Use simple, beautiful Hindi words that rhyme well

OUTPUT FORMAT:
[Verse]
Hindi lyrics here...

[Chorus]
Hindi lyrics here...

[Verse 2]
Hindi lyrics here...

[Chorus]
Hindi lyrics here...

[Bridge]
Hindi lyrics here...

[Outro]
Hindi lyrics here...

Generate the Hindi lyrics now:`;

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

export async function translateToHindi(englishText: string): Promise<string> {
  const prompt = `
Translate the following text to Hindi, maintaining the poetic and musical quality:

"${englishText}"

Provide only the Hindi translation:
`;

  try {
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error translating to Hindi:", error);
    throw error;
  }
}
