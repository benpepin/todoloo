'use client'

import Link from 'next/link'
import { ArrowLeft, History } from 'lucide-react'
import { getCurrentDate } from '@/utils/timeUtils'
import HistoryTable from '@/components/HistoryTable'

export default function InsightsPage() {
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
        <div className="w-full flex justify-center items-center gap-0.75">
          <div className="w-full max-w-[460px] flex flex-col justify-start items-start gap-8">

            {/* Insights Header */}
            <div className="w-full flex items-center gap-3">
              <History className="w-6 h-6" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
              <h1 className="text-2xl font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>To Do History</h1>
            </div>

            {/* History Table */}
            <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                 style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
              <HistoryTable />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
