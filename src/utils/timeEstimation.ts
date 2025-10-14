// Smart time estimation based on task keywords
export function estimateTimeFromDescription(description: string): number {
  const text = description.toLowerCase()

  // Specific task matches
  const specificMatches: Record<string, number> = {
    'walk the dog': 15,
    'call mom back': 120,
    'buy socks': 7,
    'inbox zero': 25,
    'water the monsterra': 2,
    'do laundry before i have to wear the same underwear tomorrow': 45,
    'cancel whatever i have planned for tonight': 8,
    'take out the trash': 3,
    'figure out dinner': 12,
    'update my linkedin': 18,
  }

  for (const [phrase, minutes] of Object.entries(specificMatches)) {
    if (text.includes(phrase)) return minutes
  }

  // Quick tasks (2-20 mins)
  if (text.includes('shower') || text.includes('bath')) return 20
  if (text.includes('email') || text.includes('reply')) return 10
  if (text.includes('call') || text.includes('phone')) return 15
  if (text.includes('quick') || text.includes('fast')) return 10
  if (text.includes('check') || text.includes('review')) return 15
  if (text.includes('list') || text.includes('write')) return 10
  if (text.includes('water') || text.includes('plant')) return 3
  if (text.includes('trash') || text.includes('garbage')) return 3
  if (text.includes('cancel') || text.includes('reschedule')) return 8
  if (text.includes('inbox')) return 25
  if (text.includes('walk') || text.includes('dog')) return 15
  if (text.includes('buy') || text.includes('purchase') || text.includes('shop')) return 7
  if (text.includes('laundry') || text.includes('wash')) return 45
  if (text.includes('dinner') || text.includes('meal') || text.includes('food')) return 12
  if (text.includes('linkedin') || text.includes('social media')) return 18

  // Medium tasks (30-60 mins)
  if (text.includes('cook')) return 45
  if (text.includes('exercise') || text.includes('workout') || text.includes('gym')) return 60
  if (text.includes('clean') || text.includes('tidy') || text.includes('organize')) return 30
  if (text.includes('read') || text.includes('book') || text.includes('article')) return 45
  if (text.includes('shopping') || text.includes('grocery') || text.includes('store')) return 60
  if (text.includes('meeting') || text.includes('discussion')) return 30

  // Longer tasks (1-2 hours)
  if (text.includes('project') || text.includes('work') || text.includes('coding')) return 90
  if (text.includes('study') || text.includes('learn') || text.includes('course')) return 90
  if (text.includes('document') || text.includes('report')) return 75
  if (text.includes('design') || text.includes('create') || text.includes('build')) return 120
  if (text.includes('research') || text.includes('investigate') || text.includes('analyze')) return 90

  // Very long tasks (2+ hours)
  if (text.includes('deep') || text.includes('thorough') || text.includes('complete')) return 180
  if (text.includes('marathon') || text.includes('all day') || text.includes('extensive')) return 240

  // Default fallback
  return 30
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0
    ? `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes}m`
    : `${hours} hour${hours !== 1 ? 's' : ''}`
}
