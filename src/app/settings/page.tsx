'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings as SettingsIcon, Clock } from 'lucide-react'
import { getCurrentDate } from '@/utils/timeUtils'
import { useSettingsStore } from '@/store/settingsStore'

export default function SettingsPage() {
  const [autoSave, setAutoSave] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const { showProgressIndicator, toggleProgressIndicator } = useSettingsStore()


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
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>Settings</div>
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
            
            {/* Settings Header */}
            <div className="w-full flex items-center gap-3">
              <SettingsIcon className="w-6 h-6" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
              <h1 className="text-2xl font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Settings</h1>
            </div>

            {/* Settings Sections */}
            <div className="w-full flex flex-col gap-6">
              {/* To Do Settings */}
              <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                   style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>To Do Settings</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Auto-save tasks</p>
                      <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Automatically save changes</p>
                    </div>
                    <button
                      onClick={() => setAutoSave(!autoSave)}
                      className="w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: autoSave ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)'
                      }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full transition-transform"
                           style={{
                             transform: autoSave ? 'translateX(24px)' : 'translateX(2px)'
                           }} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Show completed to dos</p>
                      <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Display finished to dos in the list</p>
                    </div>
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: showCompleted ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)'
                      }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full transition-transform"
                           style={{
                             transform: showCompleted ? 'translateX(24px)' : 'translateX(2px)'
                           }} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Show progress indicator</p>
                      <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Display carnival horse race for completed todos</p>
                    </div>
                    <button
                      onClick={toggleProgressIndicator}
                      className="w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: showProgressIndicator ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)'
                      }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full transition-transform"
                           style={{
                             transform: showProgressIndicator ? 'translateX(24px)' : 'translateX(2px)'
                           }} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
