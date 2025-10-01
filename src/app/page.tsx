'use client'

import { useEffect } from 'react'
import Header from '@/components/Header'
import TaskCard from '@/components/TaskCard'
import TaskList from '@/components/TaskList'
import { useTaskStore } from '@/store/taskStore'

export default function Home() {
  const showCreateTask = useTaskStore((state) => state.showCreateTask)
  const toggleCreateTask = useTaskStore((state) => state.toggleCreateTask)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+N (Mac) or Ctrl+N (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault()
        toggleCreateTask()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleCreateTask])

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-inter">
      <Header />
      <main className="px-4 sm:px-16 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {showCreateTask && <TaskCard />}
          <TaskList />
        </div>
      </main>
    </div>
  )
}
