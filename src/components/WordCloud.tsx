'use client'

import { useMemo } from 'react'
import { TaskHistoryEntry } from '@/types'

interface WordCloudProps {
  entries: TaskHistoryEntry[]
}

export default function WordCloud({ entries }: WordCloudProps) {
  const wordFrequencies = useMemo(() => {
    const words: { [key: string]: number } = {}

    // Common words to exclude
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'i', 'my', 'me', 'do', 'up', 'or'
    ])

    entries.forEach(entry => {
      const entryWords = entry.originalDescription
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))

      entryWords.forEach(word => {
        words[word] = (words[word] || 0) + 1
      })
    })

    // Convert to array and sort by frequency
    return Object.entries(words)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30) // Top 30 words
  }, [entries])

  if (wordFrequencies.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-sm font-['Outfit']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
          Complete more tasks to see your word cloud
        </div>
      </div>
    )
  }

  const maxFrequency = wordFrequencies[0][1]

  return (
    <div className="flex flex-wrap gap-3 justify-center items-center py-4">
      {wordFrequencies.map(([word, frequency], index) => {
        const size = Math.max(12, Math.min(32, 12 + (frequency / maxFrequency) * 20))
        const opacity = 0.5 + (frequency / maxFrequency) * 0.5

        // Assign colors based on position
        const colors = [
          'var(--color-todoloo-gradient-start)',
          'var(--color-todoloo-gradient-end)',
          '#22c55e',
          '#9333ea',
          '#3b82f6',
          '#f59e0b'
        ]
        const color = colors[index % colors.length]

        return (
          <span
            key={word}
            className="font-['Outfit'] font-semibold hover:opacity-100 transition-opacity cursor-default"
            style={{
              fontSize: `${size}px`,
              color,
              opacity
            }}
            title={`${frequency} occurrence${frequency > 1 ? 's' : ''}`}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}
