'use client'

import Link from 'next/link'
import { History, Zap, Turtle, Cloud } from 'lucide-react'
import { getCurrentDate } from '@/utils/timeUtils'
import HistoryTable from '@/components/HistoryTable'
import WordCloud from '@/components/WordCloud'
import { useHistoryStore } from '@/store/historyStore'
import { useMemo } from 'react'

export default function InsightsPage() {
  const entries = useHistoryStore((state) => state.entries)

  const personalRecords = useMemo(() => {
    if (entries.length === 0) return null

    const fastest = entries.reduce((min, entry) =>
      entry.actualMinutes < min.actualMinutes ? entry : min
    )

    const slowest = entries.reduce((max, entry) =>
      entry.actualMinutes > max.actualMinutes ? entry : max
    )

    return { fastest, slowest }
  }, [entries])

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return (
    <div className="w-full h-screen flex" style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>
      {/* Sidebar - 33% width */}
      <div className="w-1/3 h-full p-8 overflow-hidden border-r flex flex-col justify-between items-start"
           style={{
             backgroundColor: 'var(--color-todoloo-sidebar)',
             borderColor: 'var(--color-todoloo-border)'
           }}>
        <div className="w-full flex flex-col justify-start items-start gap-1.5">
          <div className="w-full text-[42px] font-['Geist'] font-light"
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>Insights</div>
          <div className="w-full text-base font-['Geist'] font-normal"
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>{getCurrentDate()}</div>
        </div>
        <div className="w-full flex justify-start items-start gap-4">
          <Link href="/"
                className="text-xs font-['Geist'] font-normal transition-colors"
                style={{
                  color: 'var(--color-todoloo-text-muted)'
                } as React.CSSProperties}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-todoloo-text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-todoloo-text-muted)'}>
            ← Back to Todos
          </Link>
        </div>
      </div>

      {/* Main Content - 67% width */}
      <div className="w-2/3 h-full p-8 overflow-y-auto flex flex-col justify-start items-center gap-2.5"
           style={{ backgroundColor: 'var(--color-todoloo-main)' }}>
        <div className="w-full flex justify-center items-center">
          <div className="w-full max-w-6xl flex flex-col justify-start items-start gap-8">

            {/* Insights Header */}
            <div className="w-full flex items-center gap-3">
              <History className="w-6 h-6" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
              <h1 className="text-2xl font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>To Do History</h1>
            </div>

            {/* Stats Grid */}
            {personalRecords && (
              <div className="w-full grid grid-cols-3 gap-4">
                {/* Fastest Task */}
                <div className="rounded-xl shadow-sm border p-5"
                     style={{
                       backgroundColor: 'var(--color-todoloo-card)',
                       borderColor: 'var(--color-todoloo-border)'
                     }}>
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                      <Zap className="w-5 h-5" style={{ color: '#22c55e' }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-['Geist'] font-medium mb-1" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                        Fastest Task
                      </div>
                      <div className="text-2xl font-['Geist'] font-semibold mb-1" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                        {formatDuration(personalRecords.fastest.actualMinutes)}
                      </div>
                      <div className="text-sm font-['Geist'] line-clamp-1" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                        {personalRecords.fastest.originalDescription}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slowest Task */}
                <div className="rounded-xl shadow-sm border p-5"
                     style={{
                       backgroundColor: 'var(--color-todoloo-card)',
                       borderColor: 'var(--color-todoloo-border)'
                     }}>
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)' }}>
                      <Turtle className="w-5 h-5" style={{ color: '#9333ea' }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-['Geist'] font-medium mb-1" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                        Longest Task
                      </div>
                      <div className="text-2xl font-['Geist'] font-semibold mb-1" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                        {formatDuration(personalRecords.slowest.actualMinutes)}
                      </div>
                      <div className="text-sm font-['Geist'] line-clamp-1" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                        {personalRecords.slowest.originalDescription}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Tasks */}
                <div className="rounded-xl shadow-sm border p-5"
                     style={{
                       backgroundColor: 'var(--color-todoloo-card)',
                       borderColor: 'var(--color-todoloo-border)'
                     }}>
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <History className="w-5 h-5" style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-['Geist'] font-medium mb-1" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                        Total Completed
                      </div>
                      <div className="text-2xl font-['Geist'] font-semibold mb-1" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                        {entries.length}
                      </div>
                      <div className="text-sm font-['Geist']" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                        Tasks
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Word Cloud */}
            {entries.length > 0 && (
              <div className="w-full rounded-xl shadow-sm border p-6"
                   style={{
                     backgroundColor: 'var(--color-todoloo-card)',
                     borderColor: 'var(--color-todoloo-border)'
                   }}>
                <div className="flex items-center gap-2 mb-4">
                  <Cloud className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-semibold" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                    Most Common Words
                  </h2>
                </div>
                <WordCloud entries={entries} />
              </div>
            )}

            {/* History Table */}
            <div className="w-full rounded-xl shadow-sm border p-6"
                 style={{
                   backgroundColor: 'var(--color-todoloo-card)',
                   borderColor: 'var(--color-todoloo-border)'
                 }}>
              <HistoryTable />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
