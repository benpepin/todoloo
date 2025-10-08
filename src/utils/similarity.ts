import { TaskHistoryEntry, SimilarTaskStats } from '@/types'

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

export function getTokenSet(text: string): Set<string> {
  if (!text || typeof text !== 'string') return new Set()
  const tokens = text.split(' ').filter(token => token.length > 2) // Filter short words
  return new Set(tokens)
}

export function computeSimilarityScore(text1: string, text2: string): number {
  const tokens1 = getTokenSet(text1)
  const tokens2 = getTokenSet(text2)
  
  if (tokens1.size === 0 && tokens2.size === 0) return 1
  if (tokens1.size === 0 || tokens2.size === 0) return 0
  
  const intersection = new Set([...tokens1].filter(token => tokens2.has(token)))
  const union = new Set([...tokens1, ...tokens2])
  
  return intersection.size / union.size // Jaccard similarity
}

export function findSimilarEntries(
  description: string, 
  entries: TaskHistoryEntry[], 
  threshold: number = 0.4
): TaskHistoryEntry[] {
  const normalizedDescription = normalizeText(description)
  
  return entries.filter(entry => {
    const similarity = computeSimilarityScore(normalizedDescription, entry.normalizedDescription)
    return similarity >= threshold
  })
}

export function computeStats(entries: TaskHistoryEntry[]): Omit<SimilarTaskStats, 'similarEntries'> {
  if (entries.length === 0) {
    return {
      count: 0,
      averageMinutes: 0,
      medianMinutes: 0,
      p90Minutes: 0,
    }
  }

  const actualMinutes = entries.map(entry => entry.actualMinutes).sort((a, b) => a - b)
  const averageMinutes = actualMinutes.reduce((sum, minutes) => sum + minutes, 0) / actualMinutes.length
  const medianMinutes = actualMinutes[Math.floor(actualMinutes.length / 2)]
  const p90Index = Math.floor(actualMinutes.length * 0.9)
  const p90Minutes = actualMinutes[p90Index] || actualMinutes[actualMinutes.length - 1]

  return {
    count: entries.length,
    averageMinutes: Math.round(averageMinutes),
    medianMinutes,
    p90Minutes,
  }
}

export function getSimilarTaskStats(
  description: string,
  entries: TaskHistoryEntry[],
  threshold: number = 0.4
): SimilarTaskStats {
  const similarEntries = findSimilarEntries(description, entries, threshold)
  const stats = computeStats(similarEntries)
  
  return {
    ...stats,
    similarEntries,
  }
}
