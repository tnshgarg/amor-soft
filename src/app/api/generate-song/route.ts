import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabase } from '@/lib/supabase'
import { optimizeLyricsPrompt } from '@/lib/gemini'
import { findSimilarLyrics } from '@/lib/lyrics-processor'
import { sunoClient } from '@/lib/suno-client'

interface GenerateSongRequest {
  prompt: string
  style_tags: string[]
  title?: string
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    try {
      const body: GenerateSongRequest = await req.json()
      const { prompt, style_tags, title } = body

      if (!prompt || !style_tags || style_tags.length === 0) {
        return NextResponse.json(
          { error: 'Prompt and style tags are required' },
          { status: 400 }
        )
      }

      // Step 1: Find similar lyrics for context
      console.log('Finding similar lyrics...')
      const similarLyrics = await findSimilarLyrics(prompt, 3, 0.3)
      const contextLyrics = similarLyrics.map(item => item.lyrics_text)

      // Step 2: Optimize lyrics prompt using Gemini
      console.log('Optimizing lyrics with Gemini...')
      const optimizedLyrics = await optimizeLyricsPrompt(
        prompt,
        style_tags,
        contextLyrics
      )

      // Step 3: Generate music using Suno API
      console.log('Generating music with Suno...')
      const songTitle = title || `Hindi Song - ${Date.now()}`
      
      const generateRequest = {
        task_type: 'create_music' as const,
        custom_mode: true,
        prompt: optimizedLyrics,
        title: songTitle,
        tags: style_tags.join(', '),
        mv: 'chirp-v4' as const
      }

      const generateResponse = await sunoClient.generateMusic(generateRequest)
      
      if (!generateResponse.task_id) {
        throw new Error('Failed to start music generation')
      }

      // Step 4: Wait for completion (with timeout)
      console.log('Waiting for music generation to complete...')
      const completedTask = await sunoClient.waitForCompletion(
        generateResponse.task_id,
        300000, // 5 minutes
        15000   // 15 seconds polling
      )

      if (!completedTask.data || completedTask.data.length === 0) {
        throw new Error('No music data returned')
      }

      const musicData = completedTask.data[0]

      // Step 5: Save to database
      console.log('Saving song to database...')
      const { data: song, error: dbError } = await supabase
        .from('songs')
        .insert({
          user_id: userId,
          title: musicData.title,
          prompt: prompt,
          style_tags: style_tags,
          lyrics: optimizedLyrics,
          audio_url: musicData.audio_url
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error('Failed to save song to database')
      }

      return NextResponse.json({
        success: true,
        song_id: song.id,
        title: song.title,
        lyrics: song.lyrics,
        audio_url: song.audio_url,
        message: 'Song generated successfully!'
      })

    } catch (error) {
      console.error('Error generating song:', error)
      
      return NextResponse.json(
        { 
          error: 'Failed to generate song',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}
