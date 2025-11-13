import { Task } from '@/types'
import { supabase } from './supabase-browser'

const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1/music'

interface TaskCategory {
  keywords: string[]
  genre: string
  bpm: number
  vibe: string
  lyricTemplate: string
}

// Categorize tasks to generate appropriate music styles
const TASK_CATEGORIES: TaskCategory[] = [
  {
    keywords: ['workout', 'exercise', 'run', 'gym', 'fitness', 'train', 'lift'],
    genre: 'energetic EDM rock',
    bpm: 145,
    vibe: 'powerful, motivational',
    lyricTemplate: 'Push it harder, feel the burn, every rep I take my turn, getting stronger every day, nothing standing in my way'
  },
  {
    keywords: ['code', 'coding', 'program', 'develop', 'debug', 'build', 'software', 'website', 'app'],
    genre: 'electronic lo-fi',
    bpm: 120,
    vibe: 'focused, steady',
    lyricTemplate: 'Writing code line by line, solving problems feeling fine, building something new today, creating in my own way'
  },
  {
    keywords: ['clean', 'organize', 'tidy', 'declutter', 'laundry', 'dishes', 'vacuum'],
    genre: 'upbeat pop',
    bpm: 130,
    vibe: 'productive, cheerful',
    lyricTemplate: 'Cleaning up and getting things done, making progress having fun, every space is looking bright, everything is feeling right'
  },
  {
    keywords: ['write', 'design', 'create', 'draw', 'paint', 'compose', 'creative'],
    genre: 'indie alternative',
    bpm: 110,
    vibe: 'inspirational, flowing',
    lyricTemplate: 'Creating something from my mind, inspiration I will find, expressing what I need to say, bringing visions out today'
  },
  {
    keywords: ['read', 'study', 'learn', 'research', 'review', 'practice'],
    genre: 'ambient electronic',
    bpm: 100,
    vibe: 'calm, encouraging',
    lyricTemplate: 'Learning something new today, growing in my own way, knowledge flowing through my mind, understanding I will find'
  },
  {
    keywords: ['cook', 'bake', 'prepare', 'meal', 'recipe'],
    genre: 'upbeat folk pop',
    bpm: 125,
    vibe: 'warm, joyful',
    lyricTemplate: 'Cooking up something great, good things come to those who wait, mixing flavors with some care, magic happening right here'
  }
]

/**
 * Analyzes a task description to determine the best music category
 */
function categorizeTask(description: string): TaskCategory {
  const lowerDesc = description.toLowerCase()

  for (const category of TASK_CATEGORIES) {
    if (category.keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category
    }
  }

  // Default montage-style music
  return {
    keywords: [],
    genre: 'upbeat pop rock',
    bpm: 135,
    vibe: 'motivational, energetic',
    lyricTemplate: 'Getting things done one by one, working hard until I\'m done, every step brings me closer, to the finish getting stronger'
  }
}

/**
 * Generates a personalized music prompt based on task description
 */
function generateMusicPrompt(task: Task): string {
  const category = categorizeTask(task.description)

  // Create task-specific lyrics by incorporating the task description
  const taskAction = task.description.length > 50
    ? task.description.substring(0, 50) + '...'
    : task.description

  const customLyrics = `Time to ${taskAction}, ${category.lyricTemplate}`

  const prompt = `${category.genre} montage song, ${category.bpm} BPM, ${category.vibe} vocals, cinematic production. Lyrics: "${customLyrics}". Professional studio quality, uplifting melody, clear singing voice.`

  return prompt
}

/**
 * Calculates music duration based on estimated task time
 * Capped at 30 seconds for quick montage clips
 */
function calculateMusicDuration(estimatedMinutes: number): number {
  // Always return 30 seconds (30000ms) for consistent short clips
  const DURATION = 30000

  return DURATION
}

/**
 * Generates music for a task using Eleven Labs API
 * @param task - The task to generate music for
 * @returns URL to the generated audio file
 */
export async function generateMusicForTask(task: Task): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY

  if (!apiKey) {
    throw new Error('Eleven Labs API key not configured. Please add NEXT_PUBLIC_ELEVEN_LABS_API_KEY to your .env.local file.')
  }

  const prompt = generateMusicPrompt(task)
  const durationMs = calculateMusicDuration(task.estimatedMinutes)

  console.log('Generating music with prompt:', prompt)
  console.log('Duration:', durationMs, 'ms (', Math.round(durationMs / 1000), 'seconds )')

  try {
    const response = await fetch(ELEVEN_LABS_API_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        music_length_ms: durationMs,
        model_id: 'music_v1',
        force_instrumental: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Eleven Labs API error:', errorText)

      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your NEXT_PUBLIC_ELEVEN_LABS_API_KEY.')
      } else if (response.status === 422) {
        throw new Error('Invalid request. The prompt may contain copyrighted content or invalid parameters.')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      } else {
        throw new Error(`Music generation failed: ${response.status} ${response.statusText}`)
      }
    }

    // Get the binary audio data
    const audioBlob = await response.blob()

    // Upload to Supabase Storage
    const fileName = `task-music/${task.id}-${Date.now()}.mp3`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('music')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading to Supabase Storage:', uploadError)
      throw new Error(`Failed to save music file: ${uploadError.message}`)
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('music')
      .getPublicUrl(fileName)

    console.log('Music uploaded successfully:', publicUrl)
    return publicUrl
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred while generating music.')
  }
}

/**
 * Deletes a music file from Supabase Storage
 */
export async function deleteMusicFile(url: string, taskId: string) {
  try {
    // Extract filename from URL
    const fileName = `task-music/${taskId}-${url.split('/').pop()}`

    const { error } = await supabase.storage
      .from('music')
      .remove([fileName])

    if (error) {
      console.error('Error deleting music file:', error)
    }
  } catch (error) {
    console.error('Failed to delete music file:', error)
  }
}
