'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import ToDoList from '@/components/ToDoList'
import SettingsBackup from '@/components/SettingsBackup'
import { useToDoStore } from '@/store/toDoStore'
import { getCurrentDate, getCompletionTime } from '@/utils/timeUtils'

export default function Home() {
  const toggleCreateTask = useToDoStore((state) => state.toggleCreateTask)
  const tasks = useToDoStore((state) => state.tasks)
  const addTask = useToDoStore((state) => state.addTask)
  
  
  // Calculate total time for incomplete to dos
  const totalMinutes = tasks
    .filter(task => !task.isCompleted)
    .reduce((total, task) => total + task.estimatedMinutes, 0)
  
  const completionTime = totalMinutes > 0 ? getCompletionTime(totalMinutes) : "4:00 PM"

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if no input/textarea is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )

      if (!isInputFocused) {
        // Handle 'n' key for new to do
        if (event.key.toLowerCase() === 'n') {
          event.preventDefault()
          toggleCreateTask()
        }
        
        // Handle number keys (1-9) to create that many to dos
        const num = parseInt(event.key)
        if (num >= 1 && num <= 9) {
          event.preventDefault()
          for (let i = 0; i < num; i++) {
            addTask(`To Do ${i + 1}`, 15) // Default 15 minutes
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCreateTask, addTask])

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
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>
            Done at {completionTime}
          </div>
          <div className="w-full text-base font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>
            {getCurrentDate()}
          </div>
        </div>
        <div className="w-full flex justify-start items-start gap-4">
          <Link href="/settings" 
                className="text-xs font-['Geist'] font-normal transition-colors cursor-pointer"
                style={{ 
                  color: 'var(--color-todoloo-text-muted)'
                } as React.CSSProperties}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-todoloo-text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-todoloo-text-muted)'}>
            Settings
          </Link>
          <div className="text-xs font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-muted)' }}>•</div>
          <div className="text-xs font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-muted)' }}>Terms</div>
          <div className="text-xs font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-muted)' }}>•</div>
          <div className="text-xs font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-muted)' }}>Give Feedback</div>
        </div>
      </div>
      
      {/* Main Content - 67% width */}
      <div className="w-2/3 h-full p-8 overflow-y-auto flex flex-col justify-start items-center gap-2.5"
           style={{ backgroundColor: 'var(--color-todoloo-main)' }}>
        <div className="w-full flex justify-center items-center gap-0.75">
          <div className="w-full max-w-[460px] flex flex-col justify-start items-start gap-8">
            <ToDoList />
          </div>
        </div>
      </div>
      
      <SettingsBackup />
    </div>
  )
}
