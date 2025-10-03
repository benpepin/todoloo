'use client'

import { useEffect } from 'react'
import Header from '@/components/Header'
import TaskList from '@/components/TaskList'
import SettingsBackup from '@/components/SettingsBackup'
import { useTaskStore } from '@/store/taskStore'

export default function Home() {
  const toggleCreateTask = useTaskStore((state) => state.toggleCreateTask)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if no input/textarea is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )

      if (!isInputFocused && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        toggleCreateTask()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCreateTask])

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-inter">
      <Header />
      <main className="px-4 sm:px-16 py-8">
        <div className="w-[600px] mx-auto">
          <TaskList />
        </div>
      </main>
      <SettingsBackup />
    </div>
  )
}
