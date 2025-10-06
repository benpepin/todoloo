'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings as SettingsIcon, Palette, Clock, Database, Trash2, History, LogOut } from 'lucide-react'
import { getCurrentDate } from '@/utils/timeUtils'
import { useTheme } from '@/contexts/ThemeContext'
import HistoryTable from '@/components/HistoryTable'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const [autoSave, setAutoSave] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const { supabase, user } = useSupabase()
  const router = useRouter()


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
              {/* Account */}
              <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                   style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <LogOut className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Account</h2>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>{user?.email ?? 'Signed in'}</p>
                    <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>You are currently signed in</p>
                  </div>
                  <button
                    onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
                    className="px-4 py-2 bg-zinc-100 rounded-md shadow-[0px_4px_7px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-zinc-300 inline-flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-['Inter']">Sign out</span>
                  </button>
                </div>
              </div>
              

              {/* Appearance */}
              <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                   style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Palette className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Appearance</h2>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Dark mode</p>
                    <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Switch to dark theme</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="w-12 h-6 rounded-full transition-colors"
                    style={{
                      backgroundColor: theme === 'dark' ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)'
                    }}
                  >
                    <div className="w-5 h-5 bg-white rounded-full transition-transform"
                         style={{
                           transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(2px)'
                         }} />
                  </button>
                </div>
              </div>

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
                </div>
              </div>

              {/* History Filtering */}
              <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                   style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <History className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>History Filtering</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-['Geist'] font-medium mb-2" style={{ color: 'var(--color-todoloo-text-primary)' }}>Search & Filter Options</p>
                    <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Filtering controls have been moved here from the history table for a cleaner interface. These features will be available in a future update.</p>
                  </div>
                </div>
              </div>

              {/* To Do History */}
              <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                   style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <History className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>To Do History</h2>
                </div>
                <HistoryTable />
              </div>

              {/* Data Management */}
              <div className="w-full rounded-[10px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
                   style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Database className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  <h2 className="text-lg font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Data Management</h2>
                </div>
                <div className="space-y-4">
                  <button className="w-full text-left p-3 rounded-lg border transition-colors"
                          style={{ 
                            backgroundColor: 'var(--color-todoloo-card)',
                            borderColor: 'var(--color-todoloo-border)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-todoloo-muted)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-todoloo-card)'}>
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                      <div>
                        <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Export data</p>
                        <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Download your tasks as JSON</p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border transition-colors"
                          style={{ 
                            backgroundColor: 'var(--color-todoloo-card)',
                            borderColor: 'var(--color-todoloo-border)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-todoloo-muted)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-todoloo-card)'}>
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                      <div>
                        <p className="text-sm font-['Geist'] font-medium" style={{ color: 'var(--color-todoloo-text-primary)' }}>Import data</p>
                        <p className="text-xs font-['Geist']" style={{ color: 'var(--color-todoloo-text-muted)' }}>Upload tasks from JSON file</p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg border transition-colors"
                          style={{ 
                            backgroundColor: '#fee2e2',
                            borderColor: '#fecaca',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}>
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4" style={{ color: '#dc2626' }} />
                      <div>
                        <p className="text-sm font-['Geist'] font-medium" style={{ color: '#dc2626' }}>Clear all data</p>
                        <p className="text-xs font-['Geist']" style={{ color: '#dc2626' }}>Permanently delete all tasks</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
