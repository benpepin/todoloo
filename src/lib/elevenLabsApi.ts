import { Task } from '@/types'
import { supabase } from './supabase-browser'

const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1/music'

interface TaskCategory {
  keywords: string[]
  genres: string[] // Multiple genre options for variety
  bpmRange: [number, number] // BPM range instead of fixed value
  vibes: string[] // Multiple vibe options
  lyricTemplates: string[] // Multiple lyric templates
  songStyles: string[] // Different structural styles
}

// Categorize tasks to generate appropriate music styles
const TASK_CATEGORIES: TaskCategory[] = [
  {
    keywords: ['workout', 'exercise', 'run', 'gym', 'fitness', 'train', 'lift', 'cardio', 'weights'],
    genres: ['energetic EDM', 'hard rock', 'electronic rock', 'aggressive hip-hop', 'intense drum and bass'],
    bpmRange: [140, 160],
    vibes: ['powerful and intense', 'aggressive and motivating', 'fierce and determined', 'explosive and energetic'],
    lyricTemplates: [
      'Push it harder feel the burn, every rep I take my turn, getting stronger every day',
      'No excuses no regrets, breaking limits crushing sets, this is where the champions play',
      'Sweat and power fuel the fire, pushing higher and higher, nothing gonna stop me now'
    ],
    songStyles: ['anthemic chorus', 'driving rhythm', 'epic buildup']
  },
  {
    keywords: ['code', 'coding', 'program', 'develop', 'debug', 'build', 'software', 'website', 'app', 'deploy'],
    genres: ['lo-fi electronic', 'synthwave', 'chillhop', 'ambient techno', 'downtempo electronica'],
    bpmRange: [100, 125],
    vibes: ['focused and steady', 'cerebral and flowing', 'deep concentration', 'methodical and precise'],
    lyricTemplates: [
      'Writing code line by line, solving problems feeling fine, building something new today',
      'Binary dreams and logic streams, creating digital realities, one function at a time',
      'Debug the errors find the way, algorithms guide my day, innovation in the code I write'
    ],
    songStyles: ['minimal groove', 'layered atmosphere', 'steady pulse']
  },
  {
    keywords: ['clean', 'organize', 'tidy', 'declutter', 'laundry', 'dishes', 'vacuum', 'dust'],
    genres: ['upbeat pop', 'disco funk', 'dance pop', 'indie pop', 'feel-good soul'],
    bpmRange: [120, 140],
    vibes: ['productive and cheerful', 'energetic and positive', 'bright and uplifting', 'satisfying and rhythmic'],
    lyricTemplates: [
      'Cleaning up and getting things done, making progress having fun, every space is looking bright',
      'Organizing my world today, putting everything away, satisfaction in the work I do',
      'Shine and sparkle everywhere, fresh and clean beyond compare, transforming chaos into order'
    ],
    songStyles: ['bouncy rhythm', 'catchy hook', 'groovy bassline']
  },
  {
    keywords: ['write', 'design', 'create', 'draw', 'paint', 'compose', 'creative', 'art', 'sketch'],
    genres: ['indie alternative', 'art rock', 'dream pop', 'alternative folk', 'experimental indie'],
    bpmRange: [90, 115],
    vibes: ['inspirational and flowing', 'artistic and expressive', 'imaginative and free', 'contemplative and creative'],
    lyricTemplates: [
      'Creating something from my mind, inspiration I will find, expressing what I need to say',
      'Colors blend and ideas flow, watching my creation grow, art is born from heart and soul',
      'Imagination takes the lead, planting every creative seed, bringing visions into light'
    ],
    songStyles: ['atmospheric build', 'melodic journey', 'ethereal soundscape']
  },
  {
    keywords: ['read', 'study', 'learn', 'research', 'review', 'practice', 'memorize', 'exam'],
    genres: ['ambient electronic', 'classical crossover', 'neo-classical', 'study beats', 'minimal piano'],
    bpmRange: [85, 105],
    vibes: ['calm and encouraging', 'focused and peaceful', 'contemplative and clear', 'gentle and absorbing'],
    lyricTemplates: [
      'Learning something new today, growing in my own way, knowledge flowing through my mind',
      'Every page reveals a world, wisdom slowly unfurled, understanding comes with time',
      'Absorbing information deep, concepts I will always keep, education sets me free'
    ],
    songStyles: ['gentle progression', 'meditative flow', 'soft dynamics']
  },
  {
    keywords: ['cook', 'bake', 'prepare', 'meal', 'recipe', 'chef', 'kitchen'],
    genres: ['upbeat folk pop', 'jazz fusion', 'latin pop', 'acoustic pop', 'world music'],
    bpmRange: [115, 135],
    vibes: ['warm and joyful', 'playful and savory', 'inviting and delicious', 'celebratory and rich'],
    lyricTemplates: [
      'Cooking up something great, good things come to those who wait, mixing flavors with some care',
      'Spices dancing in the air, culinary art everywhere, creating magic with my hands',
      'Recipe for something fine, ingredients combine, kitchen symphony divine'
    ],
    songStyles: ['jazzy groove', 'playful melody', 'rhythmic cooking']
  },
  {
    keywords: ['meeting', 'call', 'presentation', 'zoom', 'conference', 'discuss'],
    genres: ['corporate pop rock', 'contemporary indie', 'motivational acoustic', 'professional pop'],
    bpmRange: [100, 120],
    vibes: ['confident and professional', 'articulate and clear', 'engaging and dynamic', 'polished and prepared'],
    lyricTemplates: [
      'Speaking up and making points, every idea perfectly joints, communication on display',
      'Presenting with confidence and grace, ideas finding their place, collaboration takes the stage',
      'Meeting minds and sharing views, exchanging all the latest news, connection through the screen'
    ],
    songStyles: ['steady confidence', 'clear structure', 'professional tone']
  },
  {
    keywords: ['email', 'inbox', 'reply', 'message', 'respond', 'communication'],
    genres: ['minimal electronic', 'typing beats', 'lo-fi pop', 'modern jazz'],
    bpmRange: [95, 115],
    vibes: ['efficient and smooth', 'rhythmic typing flow', 'productive correspondence', 'organized clarity'],
    lyricTemplates: [
      'Typing out my thoughts so clear, messages I need to share, inbox zero drawing near',
      'Words and sentences align, communication by design, every email finds its way',
      'Responding with precision and care, digital dialogue everywhere, connecting through the words'
    ],
    songStyles: ['staccato rhythm', 'mechanical precision', 'flowing communication']
  },
  {
    keywords: ['shop', 'shopping', 'groceries', 'store', 'buy', 'purchase'],
    genres: ['upbeat indie pop', 'electro-pop', 'quirky pop', 'synth pop'],
    bpmRange: [120, 135],
    vibes: ['playful and purposeful', 'bouncy and efficient', 'organized shopping flow', 'list-checking satisfaction'],
    lyricTemplates: [
      'Shopping for the things I need, following my list indeed, checking off each item found',
      'Aisles and choices all around, treasures waiting to be found, cart is filling up with care',
      'Gathering supplies today, organized along the way, mission shopping underway'
    ],
    songStyles: ['bouncy tempo', 'playful progression', 'checklist rhythm']
  },
  {
    keywords: ['walk', 'stroll', 'hike', 'outside', 'nature', 'outdoor'],
    genres: ['folk acoustic', 'indie folk', 'americana', 'nature soundscape', 'organic pop'],
    bpmRange: [90, 110],
    vibes: ['peaceful and grounded', 'natural and free', 'wandering and exploratory', 'fresh air energy'],
    lyricTemplates: [
      'Walking through the open air, freedom found everywhere, nature calling out to me',
      'Steps that take me far and wide, earth and sky my trusted guide, wandering where my heart may lead',
      'Footsteps on the path I choose, nothing here for me to lose, moving forward in the sun'
    ],
    songStyles: ['walking rhythm', 'natural flow', 'earthy groove']
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

  // Default montage-style music with variety
  return {
    keywords: [],
    genres: ['upbeat pop rock', 'motivational indie', 'energetic alternative', 'driving rock', 'positive electronic'],
    bpmRange: [120, 145],
    vibes: ['motivational and energetic', 'determined and focused', 'productive and powerful', 'driven and accomplishing'],
    lyricTemplates: [
      'Getting things done one by one, working hard until I\'m done, every step brings me closer',
      'Taking action making moves, finding my productive groove, accomplishing my goals today',
      'Focus sharp and mind is clear, victory is drawing near, crossing items off my list',
      'Momentum building with each task, giving everything I ask, progress measured step by step'
    ],
    songStyles: ['motivational anthem', 'driving beat', 'energetic flow']
  }
}

/**
 * Helper function to randomly select from an array
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Helper function to get random value within a range
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Extracts key action words from task description
 */
function extractTaskAction(description: string): string {
  // Remove common filler words and get the essence
  const words = description.toLowerCase().split(' ')
  const meaningfulWords = words.filter(word =>
    !['the', 'a', 'an', 'to', 'and', 'or', 'for', 'of', 'in', 'on', 'at'].includes(word)
  )

  // Take first 3-5 meaningful words
  const actionPhrase = meaningfulWords.slice(0, Math.min(5, meaningfulWords.length)).join(' ')
  return actionPhrase.length > 40 ? actionPhrase.substring(0, 40) : actionPhrase
}

/**
 * Generates a personalized music prompt based on task description
 */
function generateMusicPrompt(task: Task): string {
  const category = categorizeTask(task.description)

  // Randomize musical elements for variety
  const genre = randomChoice(category.genres)
  const bpm = randomInRange(category.bpmRange[0], category.bpmRange[1])
  const vibe = randomChoice(category.vibes)
  const lyricTemplate = randomChoice(category.lyricTemplates)
  const songStyle = randomChoice(category.songStyles)

  // Extract meaningful task action
  const taskAction = extractTaskAction(task.description)

  // Create varied lyric structures
  const lyricVariations = [
    `Time to ${taskAction}, ${lyricTemplate}`,
    `${lyricTemplate}, focusing on ${taskAction}`,
    `Today I'm ${taskAction}, ${lyricTemplate}`,
    `${taskAction} is the mission, ${lyricTemplate}`
  ]
  const customLyrics = randomChoice(lyricVariations)

  // Randomize production descriptors for more variety
  const productionStyles = [
    'cinematic production',
    'polished studio quality',
    'modern production',
    'high-energy mix',
    'professional sound design'
  ]
  const production = randomChoice(productionStyles)

  const vocalStyles = [
    'clear singing voice',
    'powerful vocals',
    'expressive singing',
    'confident delivery',
    'dynamic vocal performance'
  ]
  const vocals = randomChoice(vocalStyles)

  // Vary prompt structure
  const promptVariations = [
    `${genre} track, ${bpm} BPM, ${vibe}, ${songStyle}, ${production}. Lyrics: "${customLyrics}". ${vocals}.`,
    `${songStyle} ${genre} song at ${bpm} BPM. ${vibe} energy with ${vocals}. ${production}. Lyrics: "${customLyrics}".`,
    `${bpm} BPM ${genre} with ${songStyle}. Vocals: ${vibe}, ${vocals}. ${production}. Lyrics: "${customLyrics}".`
  ]

  const prompt = randomChoice(promptVariations)

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
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000) // 3 minute timeout

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
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

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
      // Handle abort/timeout error
      if (error.name === 'AbortError') {
        throw new Error('Music generation timed out after 3 minutes. Please try again with a simpler task name.')
      }
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
